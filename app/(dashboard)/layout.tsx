import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import OnboardingModal from "@/components/OnboardingModal";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
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
    );
}
