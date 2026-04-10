interface ReminderEmailProps {
    customerName: string;
    businessName: string;
    date: string; // ex: "Mardi 15 avril"
    time: string; // ex: "14h30"
    rdvWord?: string; // ex: "rendez-vous", "réservation", "séance"
    service?: string;
}

export function reminderEmailHtml({ customerName, businessName, date, time, rdvWord = "rendez-vous", service }: ReminderEmailProps): string {
    const rdvWordCap = rdvWord.charAt(0).toUpperCase() + rdvWord.slice(1);
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rappel de votre rendez-vous</title>
</head>
<body style="margin: 0; padding: 0; background: #001C1C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #001C1C; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding-bottom: 28px;">
                            <div style="display: inline-block; padding: 10px 22px; border-radius: 12px; background: rgba(0,41,40,0.8); border: 1px solid rgba(0,255,145,0.1);">
                                <span style="font-size: 18px; font-weight: 800; color: #FFC745;">${businessName}</span>
                            </div>
                        </td>
                    </tr>

                    <!-- Card -->
                    <tr>
                        <td style="background: rgba(0,41,40,0.9); border: 1px solid rgba(0,255,145,0.12); border-radius: 16px; padding: 32px 28px;">

                            <!-- Icon -->
                            <div style="text-align: center; margin-bottom: 20px;">
                                <div style="display: inline-block; width: 52px; height: 52px; border-radius: 50%; background: rgba(255,199,69,0.1); border: 1px solid rgba(255,199,69,0.2); line-height: 52px; font-size: 24px; text-align: center;">
                                    🗓️
                                </div>
                            </div>

                            <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #FFC745; text-align: center;">
                                Rappel de votre ${rdvWord}
                            </h1>
                            <p style="margin: 0 0 28px; font-size: 14px; color: #a1a1aa; text-align: center;">
                                Bonjour <strong style="color: #e4e4e7;">${customerName}</strong>, voici un rappel de votre ${rdvWord} demain.
                            </p>

                            <!-- RDV details -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid rgba(0,255,145,0.1); border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 14px 16px; border-bottom: 1px solid rgba(0,255,145,0.08);">
                                        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; display: block; margin-bottom: 4px;">Date</span>
                                        <span style="font-size: 15px; font-weight: 600; color: #e4e4e7;">${date}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 14px 16px; ${service ? "border-bottom: 1px solid rgba(0,255,145,0.08);" : ""}">
                                        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; display: block; margin-bottom: 4px;">Heure</span>
                                        <span style="font-size: 15px; font-weight: 600; color: #FFC745;">${time}</span>
                                    </td>
                                </tr>
                                ${service ? `
                                <tr>
                                    <td style="padding: 14px 16px;">
                                        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; display: block; margin-bottom: 4px;">Prestation</span>
                                        <span style="font-size: 15px; font-weight: 600; color: #e4e4e7;">${service}</span>
                                    </td>
                                </tr>` : ""}
                            </table>

                            <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center; line-height: 1.6;">
                                En cas d'empêchement, contactez-nous dès que possible.<br/>
                                À demain !
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 24px;">
                            <p style="margin: 0; font-size: 12px; color: #3f3f46;">
                                ${businessName} · Propulsé par Vibe Web Agency
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

export function reminderEmailSubject(businessName: string, time: string, rdvWord = "rendez-vous"): string {
    return `Rappel — Votre ${rdvWord} demain à ${time} chez ${businessName}`;
}
