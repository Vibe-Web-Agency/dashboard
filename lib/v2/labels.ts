import type { Business } from './tenant'

// Libellés métier tirés de business_types (remplace lib/businessConfig.ts côté V2).

function plural(noun: string) {
    return /[sxz]$/.test(noun) ? noun : `${noun}s`
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export function bookingLabels(business: Business) {
    const noun = business.business_type.booking_noun // ex. « réservation », « rendez-vous »
    const party = business.business_type.party_noun // ex. « couvert », null si non pertinent
    return {
        /** « Réservations », « Rendez-vous » */
        title: capitalize(plural(noun)),
        /** « réservation », « rendez-vous » */
        singular: noun,
        /** « réservations », « rendez-vous » */
        plural: plural(noun),
        /** Le commerce compte-t-il des personnes (couverts, participants) ? */
        showParty: party !== null,
        /** « Couverts » */
        partyTitle: party ? capitalize(plural(party)) : '',
        /** « 1 couvert », « 4 couverts » */
        partyCount: (n: number) => (party ? `${n} ${n > 1 ? plural(party) : party}` : String(n)),
    }
}
