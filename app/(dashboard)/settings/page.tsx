import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/v2/supabase-server";
import { getTenantContext } from "@/lib/v2/tenant";
import { getProfile, listBusinessHours } from "@/lib/v2/data/businesses";
import { loadAccountStates } from "@/lib/v2/admin-invite";
import { bookingLabels } from "@/lib/v2/labels";
import { readNotificationSettings } from "@/lib/v2/notifications";
import { getAdminClient } from "@/lib/v2/supabase-admin";
import { AccountSection, BusinessSection, HoursSection, SessionSection } from "./_components/SettingsSections";
import { NotificationsSection } from "./_components/NotificationsSection";
import { type TeamMember, TeamSection } from "./_components/TeamSection";

// Paramètres (CLAUDE.md 5.2) : données chargées côté serveur pour le commerce courant, formulaires côté client.
export default async function SettingsPage() {
    const tenant = await getTenantContext();
    if (!tenant?.currentBusiness) redirect("/login");

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const business = tenant.currentBusiness;
    const [profile, hours] = await Promise.all([getProfile(supabase, user.id), listBusinessHours(supabase, business.id)]);
    const canManage = tenant.currentRole === "owner" || tenant.currentRole === "administrator";

    // Messages automatiques : seulement si le commerce a le module de réservation.
    const reservationsModule = tenant.modules.find((m) => m.slug === "reservations");
    let notifications = null;
    if (reservationsModule) {
        const { data: mod } = await supabase.from("modules").select("id").eq("slug", "reservations").maybeSingle();
        const { data: row } = mod
            ? await supabase.from("business_module_settings").select("settings").eq("business_id", business.id).eq("module_id", mod.id).maybeSingle()
            : { data: null };
        notifications = readNotificationSettings(row?.settings);
    }

    // Accès de l'équipe : membres de ce commerce et membres de niveau agence, lus sous la session (RLS).
    let team: TeamMember[] = [];
    if (canManage) {
        const { data: memberships } = await supabase
            .from("memberships")
            .select("id, profile_id, role, business_id")
            .eq("agency_id", business.agency_id)
            .eq("is_active", true)
            .or(`business_id.eq.${business.id},business_id.is.null`);
        const ids = (memberships ?? []).map((m) => m.profile_id);
        const [{ data: profiles }, states] = await Promise.all([
            supabase.from("profiles").select("id, email, full_name").in("id", ids),
            loadAccountStates(getAdminClient()),
        ]);
        const byId = new Map((profiles ?? []).map((pr) => [pr.id, pr]));
        team = (memberships ?? []).map((m) => ({
            id: m.id,
            email: byId.get(m.profile_id)?.email ?? "—",
            fullName: byId.get(m.profile_id)?.full_name ?? null,
            role: m.role,
            isSelf: m.profile_id === user.id,
            pending: !states.get(m.profile_id)?.lastSignInAt,
            agencyLevel: m.business_id === null,
        }));
    }

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <div className="page-head">
                <div>
                    <h1>Paramètres</h1>
                    <p style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)", marginTop: 4 }}>
                        {business.name}
                    </p>
                </div>
            </div>

            {!canManage && (
                <div className="p-4 rounded-xl text-sm" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)', color: 'var(--text)' }}>
                    Seuls le propriétaire et les administrateurs peuvent modifier l&apos;établissement et ses horaires. Vous pouvez modifier votre propre compte.
                </div>
            )}

            <AccountSection profile={profile} email={user.email ?? profile?.email ?? ""} />
            <BusinessSection key={`info-${business.id}`} business={business} canManage={canManage} />
            <HoursSection key={`hours-${business.id}`} initialHours={hours} canManage={canManage} />
            {notifications && <NotificationsSection key={`notif-${business.id}`} initial={notifications} canManage={canManage} bookingPlural={bookingLabels(business).plural} />}
            {canManage && tenant.currentRole && <TeamSection key={`team-${business.id}`} members={team} currentRole={tenant.currentRole} />}
            <SessionSection />
        </div>
    );
}
