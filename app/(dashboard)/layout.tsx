import Navbar from "@/components/Navbar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen" style={{ background: '#001C1C' }}>
            <Navbar />
            <main className="flex-1 overflow-auto">
                <div className="p-6 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
