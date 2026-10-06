import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import OnboardingModal from "@/components/OnboardingModal";
import { TenantProvider } from "@/providers/TenantProvider";
import { getTenantContext } from "@/lib/v2/tenant";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const tenant = await getTenantContext();
    if (!tenant) redirect("/login");

    if (!tenant.currentBusiness) {
        return (
            <div className="flex min-h-screen items-center justify-center p-8" style={{ background: "var(--bg)" }}>
                <p className="text-center text-sm text-muted-foreground">
                    Aucun commerce n&apos;est rattaché à votre compte. Contactez votre agence pour obtenir un accès.
                </p>
            </div>
        );
    }

    return (
        <TenantProvider
            currentBusiness={tenant.currentBusiness}
            currentRole={tenant.currentRole}
            userBusinesses={tenant.userBusinesses}
        >
            <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
                <Sidebar />
                <div className="flex flex-col flex-1 min-w-0 min-h-screen">
                    <Topbar />
                    <main className="flex-1 overflow-auto" style={{ background: "var(--bg)" }}>
                        {/* Mobile top bar spacer */}
                        <div className="h-14 lg:hidden" />
                        <div className="p-4 sm:p-6 lg:p-8">
                            {children}
                        </div>
                    </main>
                </div>
                <OnboardingModal />
            </div>
        </TenantProvider>
    );
}
