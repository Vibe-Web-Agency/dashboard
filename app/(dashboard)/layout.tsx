import Sidebar from "@/components/Sidebar";
import OnboardingModal from "@/components/OnboardingModal";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen" style={{ background: "#001C1C" }}>
            <Sidebar />
            <main className="flex-1 overflow-auto">
                {/* Mobile top bar spacer */}
                <div className="h-14 lg:hidden" />
                <div className="p-6 md:p-8">
                    {children}
                </div>
            </main>
            <OnboardingModal />
        </div>
    );
}
