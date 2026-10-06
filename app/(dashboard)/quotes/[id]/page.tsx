"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { canWrite } from "@/lib/v2/roles";
import { useQuote } from "@/lib/v2/hooks/useQuotes";
import { QuoteDetail } from "../_components/QuoteDetail";

// Détail d'une demande / d'un devis (CLAUDE.md 4.2) : lien direct et affichage mobile.
export default function QuoteDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const { currentBusiness, currentRole } = useTenant();
    const { quote, loading, error, setStatus, remove } = useQuote(id);

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <Link href="/quotes" className="flex items-center gap-2 w-fit" style={{ color: 'var(--accent)' }}>
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux demandes</span>
            </Link>

            {loading && !quote ? (
                <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-3 w-64" />
                        </div>
                    </div>
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : !quote ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                    <p style={{ color: 'var(--text-2)' }}>{error ? "Impossible de charger cette demande." : "Cette demande est introuvable."}</p>
                    <Link href="/quotes">
                        <Button style={{ background: 'var(--accent)', color: '#0E0D0B' }}>Retour aux demandes</Button>
                    </Link>
                </div>
            ) : (
                <div className="rounded-xl p-6" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                    <QuoteDetail
                        quote={quote}
                        business={currentBusiness}
                        readOnly={!canWrite(currentRole)}
                        onStatusChange={setStatus}
                        onDelete={async () => { await remove(); router.push("/quotes"); }}
                    />
                </div>
            )}
        </div>
    );
}
