/**
 * L'e-mail envoyé au client quand sa réservation est déplacée.
 *
 * Écrit en couleurs littérales, pas en variables CSS : les gabarits de la v1
 * utilisent `var(--accent)`, que la plupart des clients de messagerie ne
 * savent pas lire — la couleur y tombe en noir, sans que personne ne le voie
 * côté tableau de bord.
 *
 * Tout est en styles en ligne et en tableaux pour la même raison : Outlook
 * ignore encore largement `<div>` et les feuilles de style.
 */

type Props = {
  nomClient: string;
  nomCommerce: string;
  /** « mardi 29 septembre », dans le fuseau du commerce. */
  ancienneDate: string;
  ancienneHeure: string;
  nouvelleDate: string;
  nouvelleHeure: string;
  couverts: number;
  telephone?: string | null;
};

export function deplacementEmailHtml({
  nomClient,
  nomCommerce,
  ancienneDate,
  ancienneHeure,
  nouvelleDate,
  nouvelleHeure,
  couverts,
  telephone,
}: Props): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre réservation a été déplacée</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;">
        <tr><td style="padding:28px 28px 0;">
          <p style="margin:0;font-size:18px;font-weight:600;color:#18181b;">${echapper(nomCommerce)}</p>
        </td></tr>

        <tr><td style="padding:20px 28px 0;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#18181b;">
            Bonjour ${echapper(nomClient)},
          </p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#52525b;">
            Votre réservation pour ${couverts} personne${couverts > 1 ? "s" : ""} a été déplacée.
          </p>
        </td></tr>

        <tr><td style="padding:0 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e4e4e7;border-radius:8px;">
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid #e4e4e7;">
                <p style="margin:0;font-size:12px;color:#71717a;">Anciennement</p>
                <p style="margin:2px 0 0;font-size:15px;color:#71717a;text-decoration:line-through;">
                  ${echapper(ancienneDate)} à ${echapper(ancienneHeure)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 16px;background:#eff6ff;">
                <p style="margin:0;font-size:12px;color:#1d4ed8;">Nouvelle date</p>
                <p style="margin:2px 0 0;font-size:17px;font-weight:600;color:#1d4ed8;">
                  ${echapper(nouvelleDate)} à ${echapper(nouvelleHeure)}
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:20px 28px 28px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#52525b;">
            Si ce nouvel horaire ne vous convient pas${
              telephone ? `, appelez-nous au ${echapper(telephone)}` : ", répondez à ce message"
            }. Nous trouverons une solution.
          </p>
          <p style="margin:16px 0 0;font-size:14px;color:#52525b;">À très bientôt,<br />${echapper(nomCommerce)}</p>
        </td></tr>
      </table>

      <p style="margin:16px 0 0;font-size:12px;color:#71717a;">
        Ce message concerne votre réservation. Il ne s'agit pas d'une publicité.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function deplacementEmailTexte({
  nomClient,
  nomCommerce,
  ancienneDate,
  ancienneHeure,
  nouvelleDate,
  nouvelleHeure,
  couverts,
  telephone,
}: Props): string {
  return [
    `Bonjour ${nomClient},`,
    ``,
    `Votre réservation chez ${nomCommerce} pour ${couverts} personne${couverts > 1 ? "s" : ""} a été déplacée.`,
    ``,
    `Anciennement : ${ancienneDate} à ${ancienneHeure}`,
    `Nouvelle date : ${nouvelleDate} à ${nouvelleHeure}`,
    ``,
    telephone
      ? `Si ce nouvel horaire ne vous convient pas, appelez-nous au ${telephone}.`
      : `Si ce nouvel horaire ne vous convient pas, répondez à ce message.`,
    ``,
    `À très bientôt,`,
    nomCommerce,
  ].join("\n");
}

/**
 * Échappe ce qui vient de la base.
 *
 * Un nom de client contenant `<` casserait la mise en page, et un nom choisi
 * exprès pourrait injecter du balisage dans un message qui part par e-mail.
 * Le nom vient d'un formulaire public sur le site du restaurant : il n'est
 * pas plus digne de confiance qu'une autre saisie.
 */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
