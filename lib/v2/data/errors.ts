/**
 * Écriture qui n'a modifié aucune ligne. Sous RLS, un UPDATE ou un DELETE refusé ne lève pas d'erreur :
 * il ne touche simplement rien. Sans ce contrôle, l'interface croirait l'action réussie.
 * Causes : droits insuffisants (ex. rôle viewer), ligne absente ou appartenant à un autre commerce.
 */
export class NotAllowedError extends Error {
    constructor() {
        super("Action impossible : élément introuvable ou droits insuffisants sur ce commerce.")
    }
}

/** Lève NotAllowedError si l'écriture (avec `.select('id')`) n'a touché aucune ligne. */
export function assertTouched(rows: unknown[] | null) {
    if (!rows || rows.length === 0) throw new NotAllowedError()
}
