interface CampaignEmailProps {
    businessName: string;
    subject: string;
    body: string;
    unsubscribeUrl: string;
}

export function campaignEmailHtml({ businessName, subject, body, unsubscribeUrl }: CampaignEmailProps): string {
    // Convertir les sauts de ligne en <br>
    const bodyHtml = body.replace(/\n/g, "<br/>");

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background: #001C1C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #001C1C; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

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

                            <h1 style="margin: 0 0 24px; font-size: 20px; font-weight: 700; color: #FFC745; line-height: 1.3;">
                                ${subject}
                            </h1>

                            <div style="font-size: 15px; color: #e4e4e7; line-height: 1.7;">
                                ${bodyHtml}
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 24px;">
                            <p style="margin: 0 0 8px; font-size: 12px; color: #3f3f46;">
                                ${businessName} · Propulsé par Vibe Web Agency
                            </p>
                            <a href="${unsubscribeUrl}" style="font-size: 11px; color: #52525b; text-decoration: underline;">
                                Se désabonner de ces emails
                            </a>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
