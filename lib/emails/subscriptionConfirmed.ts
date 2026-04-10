interface SubscriptionConfirmedProps {
    businessName: string;
    planLabel: string;
    addons: string[];
    totalMonthly: number;
    invoiceUrl: string | null;
    isUpdate?: boolean;
}

export function subscriptionConfirmedHtml({
    businessName,
    planLabel,
    addons,
    totalMonthly,
    invoiceUrl,
    isUpdate = false,
}: SubscriptionConfirmedProps): string {
    const title = isUpdate ? "Votre abonnement a été mis à jour" : "Bienvenue — abonnement confirmé !";
    const subtitle = isUpdate
        ? "Votre formule a bien été modifiée. Voici le récapitulatif de votre nouvel abonnement."
        : "Votre abonnement est maintenant actif. Voici le récapitulatif de votre formule.";

    const addonsHtml = addons.length > 0
        ? addons.map(a => `
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(0,255,145,0.08); color: #a1a1aa; font-size: 14px;">
                    + ${a}
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(0,255,145,0.08); text-align: right; color: #a1a1aa; font-size: 14px;">
                    option
                </td>
            </tr>`).join("")
        : "";

    const invoiceBtn = invoiceUrl ? `
        <a href="${invoiceUrl}" target="_blank"
            style="display: inline-block; margin-top: 8px; padding: 10px 24px; background: rgba(0,255,145,0.08); color: #00ff91; border: 1px solid rgba(0,255,145,0.2); border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;">
            Télécharger la facture →
        </a>` : "";

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background: #001C1C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #001C1C; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

                    <!-- Logo / Header -->
                    <tr>
                        <td align="center" style="padding-bottom: 32px;">
                            <div style="display: inline-block; padding: 12px 24px; border-radius: 12px; background: rgba(0,41,40,0.8); border: 1px solid rgba(0,255,145,0.1);">
                                <span style="font-size: 20px; font-weight: 800; color: #FFC745; letter-spacing: -0.5px;">Vibe Web Agency</span>
                            </div>
                        </td>
                    </tr>

                    <!-- Card -->
                    <tr>
                        <td style="background: rgba(0,41,40,0.9); border: 1px solid rgba(0,255,145,0.12); border-radius: 16px; padding: 36px 32px;">

                            <!-- Badge -->
                            <div style="display: inline-block; padding: 4px 12px; background: rgba(0,255,145,0.1); border: 1px solid rgba(0,255,145,0.2); border-radius: 100px; margin-bottom: 20px;">
                                <span style="color: #00ff91; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                    ${isUpdate ? "Mise à jour" : "Abonnement activé"}
                                </span>
                            </div>

                            <!-- Title -->
                            <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #FFC745; line-height: 1.3;">
                                ${title}
                            </h1>
                            <p style="margin: 0 0 28px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                                Bonjour <strong style="color: #e4e4e7;">${businessName}</strong>,<br/>
                                ${subtitle}
                            </p>

                            <!-- Récap -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid rgba(0,255,145,0.1); border-radius: 10px; overflow: hidden; margin-bottom: 28px;">
                                <tr>
                                    <td colspan="2" style="padding: 12px 16px; background: rgba(0,255,145,0.05); border-bottom: 1px solid rgba(0,255,145,0.08);">
                                        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a;">Récapitulatif</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 14px 16px; border-bottom: 1px solid rgba(0,255,145,0.08); color: #e4e4e7; font-size: 14px; font-weight: 600;">
                                        ${planLabel}
                                    </td>
                                    <td style="padding: 14px 16px; border-bottom: 1px solid rgba(0,255,145,0.08); text-align: right; color: #FFC745; font-size: 14px; font-weight: 600;">
                                        Formule principale
                                    </td>
                                </tr>
                                ${addonsHtml}
                                <tr>
                                    <td style="padding: 14px 16px; color: #e4e4e7; font-size: 15px; font-weight: 700;">
                                        Total mensuel
                                    </td>
                                    <td style="padding: 14px 16px; text-align: right; color: #FFC745; font-size: 18px; font-weight: 800;">
                                        ${totalMonthly}€<span style="font-size: 12px; font-weight: 400; color: #71717a;">/mois</span>
                                    </td>
                                </tr>
                            </table>

                            <!-- Invoice -->
                            ${invoiceUrl ? `
                            <div style="padding: 16px; background: rgba(0,255,145,0.03); border: 1px solid rgba(0,255,145,0.08); border-radius: 10px; margin-bottom: 24px;">
                                <p style="margin: 0 0 10px; font-size: 13px; color: #71717a;">Votre facture est disponible :</p>
                                ${invoiceBtn}
                            </div>` : ""}

                            <!-- CTA Dashboard -->
                            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://app.vibewebagency.fr"}"
                                style="display: block; text-align: center; padding: 14px; background: #FFC745; color: #001C1C; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                                Accéder à mon dashboard →
                            </a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 28px;">
                            <p style="margin: 0; font-size: 12px; color: #3f3f46; line-height: 1.6;">
                                Vibe Web Agency · vibewebagency.fr<br/>
                                Des questions ? Répondez directement à cet email.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function subscriptionConfirmedSubject(isUpdate: boolean, planLabel: string): string {
    return isUpdate
        ? `Votre abonnement "${planLabel}" a été mis à jour`
        : `Votre abonnement "${planLabel}" est actif 🎉`;
}
