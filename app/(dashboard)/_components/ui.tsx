"use client";

import { useCallback, useState } from "react";

// Briques communes des pages du dashboard écrites après la vague 1 (avis, équipe, actualités, statistiques, support).

export const panel = { background: "var(--bg-elev)", border: "1px solid var(--border)" } as const;
export const field = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" } as const;
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "L'opération a échoué.");

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
    return (
        <div className="page-head">
            <div>
                <h1>{title}</h1>
                {sub && <p style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)", marginTop: 4 }}>{sub}</p>}
            </div>
            {children}
        </div>
    );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div role="alert" className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
            <span>{message}</span>
            {onRetry && <button onClick={onRetry} className="shrink-0 font-medium underline" style={{ color: "var(--danger)" }}>Réessayer</button>}
        </div>
    );
}

export function Empty({ children }: { children: React.ReactNode }) {
    return <p className="py-12 text-center text-sm" style={{ color: "var(--text-faint)" }}>{children}</p>;
}

/** Lance une écriture, retient son erreur et indique qu'elle est en cours. Renvoie true si elle a réussi. */
export function useAction() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const run = useCallback(async (action: () => Promise<unknown>) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            return true;
        } catch (e) {
            setError(errorMessage(e));
            return false;
        } finally {
            setBusy(false);
        }
    }, []);
    return { run, busy, error, clearError: () => setError(null) };
}
