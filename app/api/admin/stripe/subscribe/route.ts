import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

// POST — crée ou met à jour la subscription d'un client (plan + add-ons)
export async function POST(req: NextRequest) {
    const result = await getCurrentUserProfile();
    if (!result?.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { business_id, plan_id, addon_ids } = await req.json();
    if (!business_id || !plan_id) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

    const admin = getAdminClient();

    // Récupérer le business
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: business } = await (admin as any)
        .from("businesses")
        .select("id, name, stripe_customer_id")
        .eq("id", business_id)
        .single();

    if (!business) return NextResponse.json({ error: "Business introuvable" }, { status: 404 });

    // Créer le customer Stripe si besoin
    let customerId = business.stripe_customer_id;
    if (!customerId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user } = await (admin as any)
            .from("users")
            .select("email")
            .eq("business_id", business_id)
            .single();

        const customer = await stripe.customers.create({
            name: business.name || undefined,
            email: user?.email || undefined,
            metadata: { business_id },
        });
        customerId = customer.id;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("businesses").update({ stripe_customer_id: customerId }).eq("id", business_id);
    }

    // Récupérer le plan
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plan } = await (admin as any)
        .from("plans")
        .select("id, stripe_price_id, features, label")
        .eq("id", plan_id)
        .single();

    if (!plan?.stripe_price_id) return NextResponse.json({ error: "Plan sans price Stripe" }, { status: 400 });

    // Récupérer les add-ons sélectionnés
    const selectedAddonIds: string[] = addon_ids || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: addons } = await (admin as any)
        .from("add_ons")
        .select("id, stripe_price_id, feature_key, label")
        .in("id", selectedAddonIds.length > 0 ? selectedAddonIds : ["00000000-0000-0000-0000-000000000000"]);

    const validAddons = (addons || []).filter((a: { stripe_price_id: string }) => a.stripe_price_id);

    // Vérifier s'il y a déjà une subscription active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingSubs } = await (admin as any)
        .from("stripe_subscriptions")
        .select("stripe_subscription_id")
        .eq("business_id", business_id)
        .eq("status", "active")
        .limit(1);

    const existingStripeSubId = existingSubs?.[0]?.stripe_subscription_id;

    let subscription;

    if (existingStripeSubId) {
        // Mettre à jour la subscription existante
        const existingSub = await stripe.subscriptions.retrieve(existingStripeSubId);
        const existingItems = existingSub.items.data;

        // Construire les nouveaux items
        const newPriceIds = [plan.stripe_price_id, ...validAddons.map((a: { stripe_price_id: string }) => a.stripe_price_id)];
        const itemsToAdd = newPriceIds.filter(p => !existingItems.find(i => i.price.id === p));
        const itemsToRemove = existingItems.filter(i => !newPriceIds.includes(i.price.id));

        subscription = await stripe.subscriptions.update(existingStripeSubId, {
            items: [
                ...itemsToRemove.map(i => ({ id: i.id, deleted: true })),
                ...itemsToAdd.map(p => ({ price: p })),
            ],
            proration_behavior: "create_prorations",
        });
    } else {
        // Créer une nouvelle subscription
        subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [
                { price: plan.stripe_price_id },
                ...validAddons.map((a: { stripe_price_id: string }) => ({ price: a.stripe_price_id })),
            ],
            payment_behavior: "default_incomplete",
            expand: ["latest_invoice.payment_intent"],
        });
    }

    // Synchroniser en base — supprimer les anciens, insérer les nouveaux
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("stripe_subscriptions").delete().eq("business_id", business_id);

    const subItems = subscription.items.data;
    const planItem = subItems.find((i: { price: { id: string } }) => i.price.id === plan.stripe_price_id);
    const rows = [
        {
            business_id,
            stripe_subscription_id: subscription.id,
            stripe_subscription_item_id: planItem?.id,
            type: "plan",
            plan_id: plan.id,
            addon_id: null,
            feature_key: null,
            status: subscription.status,
        },
        ...validAddons.map((addon: { id: string; stripe_price_id: string; feature_key: string }) => {
            const item = subItems.find((i: { price: { id: string } }) => i.price.id === addon.stripe_price_id);
            return {
                business_id,
                stripe_subscription_id: subscription.id,
                stripe_subscription_item_id: item?.id,
                type: "addon",
                plan_id: null,
                addon_id: addon.id,
                feature_key: addon.feature_key,
                status: subscription.status,
            };
        }),
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("stripe_subscriptions").insert(rows);

    // Mettre à jour les features du business
    const allFeatures = [
        ...plan.features,
        ...validAddons.map((a: { feature_key: string }) => a.feature_key),
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("businesses").update({ is_active: true }).eq("id", business_id);

    return NextResponse.json({ subscription_id: subscription.id, features: allFeatures });
}
