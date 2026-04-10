import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAdminClient } from "@/lib/supabase-admin";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { subscriptionConfirmedHtml, subscriptionConfirmedSubject } from "@/lib/emails/subscriptionConfirmed";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET === "whsec_...") {
        return NextResponse.json({ error: "Webhook secret non configuré" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
        return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
    }

    const admin = getAdminClient() as any;

    switch (event.type) {
        case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            const subId = (invoice as any).subscription as string;
            if (!subId) break;

            await admin.from("stripe_subscriptions").update({ status: "active" }).eq("stripe_subscription_id", subId);

            const { data: subRows } = await admin
                .from("stripe_subscriptions")
                .select(`
                    business_id, type, plan_id, addon_id,
                    plan:plans (label, monthly_price),
                    addon:add_ons (label, monthly_price)
                `)
                .eq("stripe_subscription_id", subId);

            if (!subRows?.length) break;

            const businessId = subRows[0].business_id;
            await admin.from("businesses").update({ is_active: true }).eq("id", businessId);

            // Envoyer l'email de confirmation avec la facture
            const { data: bizData } = await admin
                .from("businesses")
                .select("name")
                .eq("id", businessId)
                .single();

            const { data: userData } = await admin
                .from("users")
                .select("email")
                .eq("business_id", businessId)
                .single();

            if (userData?.email) {
                const planRow = subRows.find((r: any) => r.type === "plan");
                const addonRows = subRows.filter((r: any) => r.type === "addon");

                const planLabel = planRow?.plan?.label || "Formule";
                const addonLabels = addonRows.map((r: any) => r.addon?.label).filter(Boolean);
                const totalMonthly = (planRow?.plan?.monthly_price || 0) +
                    addonRows.reduce((sum: number, r: any) => sum + (r.addon?.monthly_price || 0), 0);

                const invoiceUrl = (invoice as any).invoice_pdf as string | null;
                // Détermine si c'est une mise à jour (billing_reason = subscription_cycle ou subscription_update)
                const isUpdate = (invoice as any).billing_reason === "subscription_update";

                await resend.emails.send({
                    from: FROM_EMAIL,
                    to: userData.email,
                    subject: subscriptionConfirmedSubject(isUpdate, planLabel),
                    html: subscriptionConfirmedHtml({
                        businessName: bizData?.name || "Client",
                        planLabel,
                        addons: addonLabels,
                        totalMonthly,
                        invoiceUrl,
                        isUpdate,
                    }),
                });
            }
            break;
        }

        case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const subId = (invoice as any).subscription as string;
            if (!subId) break;
            await admin.from("stripe_subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId);
            const { data: sub } = await admin.from("stripe_subscriptions").select("business_id").eq("stripe_subscription_id", subId).limit(1).single();
            if (sub?.business_id) {
                await admin.from("businesses").update({ is_active: false }).eq("id", sub.business_id);
            }
            break;
        }

        case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const status = subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "canceled";
            await admin.from("stripe_subscriptions").update({ status }).eq("stripe_subscription_id", subscription.id);

            const { data: sub } = await admin.from("stripe_subscriptions").select("business_id").eq("stripe_subscription_id", subscription.id).limit(1).single();
            if (sub?.business_id && status === "canceled") {
                await admin.from("businesses").update({ is_active: false }).eq("id", sub.business_id);
            }
            break;
        }

        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            await admin.from("stripe_subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", subscription.id);
            const { data: sub } = await admin.from("stripe_subscriptions").select("business_id").eq("stripe_subscription_id", subscription.id).limit(1).single();
            if (sub?.business_id) {
                await admin.from("businesses").update({ is_active: false }).eq("id", sub.business_id);
            }
            break;
        }

        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const businessId = session.metadata?.business_id;
            const planId = session.metadata?.plan_id;
            const addonIdsStr = session.metadata?.addon_ids || "";
            const stripeSubId = session.subscription as string;

            if (!businessId || !planId || !stripeSubId) break;

            const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
            const subItems = stripeSub.items.data;

            const { data: plan } = await admin
                .from("plans")
                .select("id, stripe_price_id, features, label, monthly_price")
                .eq("id", planId)
                .single();

            if (!plan?.stripe_price_id) break;

            const addonIds = addonIdsStr ? addonIdsStr.split(",").filter(Boolean) : [];
            const { data: addons } = addonIds.length > 0
                ? await admin.from("add_ons").select("id, stripe_price_id, feature_key, label, monthly_price").in("id", addonIds)
                : { data: [] };
            const validAddons = (addons || []).filter((a: { stripe_price_id: string }) => a.stripe_price_id);

            await admin.from("stripe_subscriptions").delete().eq("business_id", businessId);

            const planItem = subItems.find((i: { price: { id: string } }) => i.price.id === plan.stripe_price_id);
            const rows = [
                {
                    business_id: businessId,
                    stripe_subscription_id: stripeSubId,
                    stripe_subscription_item_id: planItem?.id,
                    type: "plan",
                    plan_id: plan.id,
                    addon_id: null,
                    feature_key: null,
                    status: stripeSub.status,
                },
                ...validAddons.map((addon: { id: string; stripe_price_id: string; feature_key: string }) => {
                    const item = subItems.find((i: { price: { id: string } }) => i.price.id === addon.stripe_price_id);
                    return {
                        business_id: businessId,
                        stripe_subscription_id: stripeSubId,
                        stripe_subscription_item_id: item?.id,
                        type: "addon",
                        plan_id: null,
                        addon_id: addon.id,
                        feature_key: addon.feature_key,
                        status: stripeSub.status,
                    };
                }),
            ];

            await admin.from("stripe_subscriptions").insert(rows);
            await admin.from("businesses").update({ is_active: true }).eq("id", businessId);

            // Email de bienvenue envoyé dès que invoice.payment_succeeded arrive — pas besoin ici
            break;
        }
    }

    return NextResponse.json({ received: true });
}
