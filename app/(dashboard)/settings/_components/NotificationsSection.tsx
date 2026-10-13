"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import type { NotificationSettings } from "@/lib/v2/notifications";
import type { Allowance } from "@/lib/v2/usage";
import { saveNotificationSettings } from "../actions";

const OPTIONS: { key: keyof NotificationSettings; label: string; help: string }[] = [
    { key: "confirmation_email", label: "Email de confirmation au client", help: "Envoyé dès qu'une réservation arrive depuis votre site." },
    { key: "reminder_email", label: "Email de rappel la veille", help: "Envoyé chaque matin pour les réservations confirmées du lendemain." },
    { key: "reminder_sms", label: "SMS de rappel la veille", help: "Chaque SMS est facturé. Nécessite le numéro de téléphone du client." },
    { key: "notify_business", label: "M'avertir par email des nouvelles demandes", help: "Envoyé à l'adresse email de l'établissement pour chaque réservation ou demande venue du site." },
];

/** Messages automatiques liés aux réservations (réglages du module « reservations »). */
export function NotificationsSection({ initial, canManage, bookingPlural, sms }: { initial: NotificationSettings; canManage: boolean; bookingPlural: string; sms: Allowance }) {
    // Les SMS sont payants : sans quota dans l'offre, l'interrupteur reste éteint et verrouillé.
    const smsIncluded = sms.limit > 0;
    const [values, setValues] = useState(initial);
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    function toggle(key: keyof NotificationSettings, checked: boolean) {
        const next = { ...values, [key]: checked };
        setValues(next);
        setMessage(null);
        startTransition(async () => {
            const result = await saveNotificationSettings(next);
            if (result.ok) setMessage({ ok: true, text: "Enregistré." });
            else { setValues(values); setMessage({ ok: false, text: result.error }); }
        });
    }

    return (
        <section className="rounded-[12px] p-6" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ background: "var(--accent-dim)" }}>
                    <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>Messages automatiques</h2>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Ce qui part tout seul autour de vos {bookingPlural}</p>
                </div>
            </div>
            <ul className="flex flex-col gap-4">
                {OPTIONS.map((o) => (
                    <li key={o.key}>
                        <label className="flex items-start gap-3">
                            <input type="checkbox" className="mt-1 h-4 w-4" style={{ accentColor: "var(--accent)" }} checked={o.key === "reminder_sms" && !smsIncluded ? false : values[o.key]} disabled={!canManage || pending || (o.key === "reminder_sms" && !smsIncluded)}
                                onChange={(e) => toggle(o.key, e.target.checked)} />
                            <span>
                                <span className="block text-sm" style={{ color: "var(--text)" }}>{o.label}</span>
                                <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                                    {o.key !== "reminder_sms" ? o.help
                                        : smsIncluded ? `${sms.used} SMS envoyé${sms.used > 1 ? "s" : ""} ce mois-ci sur ${sms.limit} inclus dans votre offre. Nécessite le numéro de téléphone du client.`
                                        : "Non inclus dans votre offre. Contactez votre agence pour ajouter des SMS."}
                                </span>
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
            {message && <p className="mt-4 text-sm" style={{ color: message.ok ? "var(--success)" : "var(--danger)" }}>{message.text}</p>}
        </section>
    );
}
