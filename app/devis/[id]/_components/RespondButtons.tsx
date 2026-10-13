"use client";

import { useState, useTransition } from "react";
import type { QuoteAnswer, QuoteResponseState } from "@/lib/v2/quote-response";
import { respondToQuote } from "../actions";

const box = { background: "var(--bg-elev)", border: "1px solid var(--border)" } as const;

/** Ce que le client voit sous son devis : les deux boutons, ou l'état de sa réponse. */
export function RespondButtons({ quoteId, token, initial, businessName }: { quoteId: string; token: string; initial: QuoteResponseState; businessName: string }) {
    const [state, setState] = useState(initial);
    const [pending, startTransition] = useTransition();
    const [failed, setFailed] = useState(false);

    const answer = (choice: QuoteAnswer) => {
        if (choice === "declined" && !window.confirm("Refuser ce devis ?")) return;
        setFailed(false);
        startTransition(async () => {
            try {
                setState(await respondToQuote(quoteId, token, choice));
            } catch {
                setFailed(true);
            }
        });
    };

    if (state.kind === "answered") {
        return (
            <div className="rounded-xl p-5 text-center" style={box} role="status">
                <p className="text-lg" style={{ color: state.answer === "accepted" ? "var(--success)" : "var(--text)" }}>
                    {state.answer === "accepted" ? "Devis accepté" : "Devis refusé"}
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    {state.answer === "accepted"
                        ? `${businessName} est prévenu et revient vers vous pour la suite.`
                        : `${businessName} est prévenu. Vous pouvez toujours le contacter pour en discuter.`}
                </p>
            </div>
        );
    }
    if (state.kind === "expired") {
        return <p className="rounded-xl p-5 text-center text-sm" style={{ ...box, color: "var(--text-muted)" }}>Ce devis n&apos;est plus valable. Contactez {businessName} pour en obtenir un nouveau.</p>;
    }
    if (state.kind === "unavailable") {
        return <p className="rounded-xl p-5 text-center text-sm" style={{ ...box, color: "var(--text-muted)" }}>Ce devis n&apos;attend pas de réponse pour le moment.</p>;
    }
    return (
        <div className="rounded-xl p-5 flex flex-col gap-3" style={box}>
            <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" disabled={pending} onClick={() => answer("accepted")} className="btn btn-primary flex-1 justify-center">{pending ? "Enregistrement…" : "J'accepte ce devis"}</button>
                <button type="button" disabled={pending} onClick={() => answer("declined")} className="btn btn-ghost flex-1 justify-center">Je refuse</button>
            </div>
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>Votre réponse est transmise aussitôt à {businessName}.</p>
            {failed && <p className="text-sm text-center" role="alert" style={{ color: "var(--danger)" }}>Votre réponse n&apos;a pas pu être enregistrée. Réessayez.</p>}
        </div>
    );
}
