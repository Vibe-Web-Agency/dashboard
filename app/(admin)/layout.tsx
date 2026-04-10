import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import AdminNavbar from "@/components/AdminNavbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const result = await getCurrentUserProfile();

    if (!result?.profile) redirect("/login");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result.profile as any).is_admin) redirect("/");

    return (
        <div className="flex flex-col min-h-screen" style={{ background: '#001C1C' }}>
            <AdminNavbar />
            <main className="flex-1 overflow-auto">
                <div className="p-6 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
