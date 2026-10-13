// Nom des personnes : la base stocke first_name et last_name (customers, profiles, employees).

type Named = { first_name: string | null; last_name: string | null }

/** « Prénom Nom », en ignorant la partie absente. Chaîne vide si aucune des deux n'est renseignée. */
export function personName(person: Named | null | undefined) {
    return [person?.first_name, person?.last_name].map((p) => p?.trim()).filter(Boolean).join(' ')
}

/**
 * Découpe un nom saisi d'un seul tenant : le premier mot est le prénom, le reste le nom.
 * « Jean-Marc de la Tour » → Jean-Marc / de la Tour ; « Dupont » → Dupont / null.
 */
export function splitFullName(fullName: string): { first_name: string | null; last_name: string | null } {
    const words = fullName.trim().split(/\s+/).filter(Boolean)
    return { first_name: words[0] ?? null, last_name: words.slice(1).join(' ') || null }
}
