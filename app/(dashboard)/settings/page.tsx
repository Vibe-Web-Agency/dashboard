import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/v2/supabase-server";
import { getTenantContext } from "@/lib/v2/tenant";
import { getProfile, listBusinessHours } from "@/lib/v2/data/businesses";
import { AccountSection, BusinessSection, HoursSection, SessionSection } from "./_components/SettingsSections";

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
            <SessionSection />
        </div>
    );
}
