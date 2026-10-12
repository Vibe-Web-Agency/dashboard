"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminResult } from "../actions";

/** Lance une Server Action du back-office, affiche son erreur et recharge les données de la page. */
export function useAdminAction() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function run<T>(action: () => Promise<AdminResult<T>>, onDone?: (data: T) => void) {
        setError(null);
        startTransition(async () => {
            const result = await action();
            if (!result.ok) setError(result.error);
            else onDone?.(result.data);
            router.refresh();
        });
    }
    return { run, pending, error };
}

export function ErrorLine({ error }: { error: string | null }) {
    return error ? <p className="text-sm" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null;
}

export function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (next: boolean) => void; label: string }) {
    return (
        <input type="checkbox" className="h-4 w-4" style={{ accentColor: "var(--accent)" }}
            checked={checked} disabled={disabled} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
    );
}
