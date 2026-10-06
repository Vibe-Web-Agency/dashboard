import type { Business } from './tenant'

// Vocabulaire métier tiré de business_types (remplace lib/businessConfig.ts côté V2) :
// - booking_noun  : ce qu'on réserve (« réservation », « leçon », « séance »…) ;
// - customer_noun : comment on appelle les clients (« client », « patient », « élève »…) ;
// - party_noun    : unité de reservations.party_size (« couvert », « joueur »), NULL si sans objet.

function plural(noun: string) {
    return /[sxz]$/.test(noun) ? noun : `${noun}s`
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export function bookingLabels(business: Business) {
    const noun = business.business_type.booking_noun
    const customer = business.business_type.customer_noun
    const party = business.business_type.party_noun
    return {
        /** « Réservations », « Rendez-vous », « Leçons » */
        title: capitalize(plural(noun)),
        /** « Réservation », « Leçon » (bouton « + Réservation ») */
        singularTitle: capitalize(noun),
        /** « réservation », « rendez-vous » */
        singular: noun,
        /** « réservations », « rendez-vous » */
        plural: plural(noun),

        /** « Clients », « Patients », « Élèves » */
        customerTitle: capitalize(plural(customer)),
        /** « Client », « Patient » */
        customerSingularTitle: capitalize(customer),
        /** « client », « patient » */
        customerSingular: customer,
        /** « clients », « patients » */
        customerPlural: plural(customer),

        /** Le commerce compte-t-il des personnes par réservation (couverts, joueurs) ? */
        showParty: party !== null,
        /** « Couverts » */
        partyTitle: party ? capitalize(plural(party)) : '',
        /** « 1 couvert », « 4 couverts » */
        partyCount: (n: number) => (party ? `${n} ${n > 1 ? plural(party) : party}` : String(n)),
    }
}

export type BookingLabels = ReturnType<typeof bookingLabels>
