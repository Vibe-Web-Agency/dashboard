import type { Business } from './tenant'

// Vocabulaire métier tiré de business_types (remplace lib/businessConfig.ts côté V2) :
// - booking_noun  : ce qu'on réserve (« réservation », « leçon », « séance »…) ;
// - customer_noun : comment on appelle les clients (« client », « patient », « élève »…) ;
// - service_noun  : ce qu'on réserve dans `services` (« formule », « prestation », « soin »…) ;
// - party_noun    : unité de reservations.party_size (« couvert », « joueur »), NULL si sans objet.

function plural(noun: string) {
    return /[sxz]$/.test(noun) ? noun : `${noun}s`
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

// Genre des mots de business_types (liste fermée, tenue dans la base). Un mot féminin absent d'ici
// serait accordé au masculin : l'ajouter ici en même temps que dans business_types.
const FEMININE = new Set([
    'réservation', 'consultation', 'séance', 'leçon', 'session', 'partie', 'intervention', 'commande',
    'demande', 'privatisation', 'formule', 'prestation', 'personne',
])

/** Formes accordées d'un nom (au singulier) : « la réservation », « cet essayage », « Nouvel élève »… */
function forms(noun: string) {
    const feminine = FEMININE.has(noun)
    const vowel = /^[aeiouyhàâéèêëîïôûù]/i.test(noun)
    return {
        /** « la réservation », « l'intervention », « le rendez-vous » */
        the: vowel ? `l'${noun}` : `${feminine ? 'la' : 'le'} ${noun}`,
        /** « une séance », « un soin » */
        a: `${feminine ? 'une' : 'un'} ${noun}`,
        /** « cette réservation », « cet essayage », « ce rendez-vous » */
        this: `${feminine ? 'cette' : vowel ? 'cet' : 'ce'} ${noun}`,
        /** « de la réservation », « de l'intervention », « du rendez-vous » */
        of: vowel ? `de l'${noun}` : feminine ? `de la ${noun}` : `du ${noun}`,
        /** « Nouvelle formule », « Nouvel élève », « Nouveau soin » */
        newTitle: `${feminine ? 'Nouvelle' : vowel ? 'Nouvel' : 'Nouveau'} ${noun}`,
        /** « Aucune réservation », « Aucun client » */
        none: `${feminine ? 'Aucune' : 'Aucun'} ${noun}`,
    }
}

export function bookingLabels(business: Business) {
    const noun = business.business_type.booking_noun
    const customer = business.business_type.customer_noun
    const party = business.business_type.party_noun
    const service = business.business_type.service_noun
    return {
        /** « Réservations », « Rendez-vous », « Leçons » */
        title: capitalize(plural(noun)),
        /** « Réservation », « Leçon » (bouton « + Réservation ») */
        singularTitle: capitalize(noun),
        /** « réservation », « rendez-vous » */
        singular: noun,
        /** « réservations », « rendez-vous » */
        plural: plural(noun),
        /** Formes accordées : booking.the, booking.newTitle, booking.none… */
        booking: forms(noun),

        /** « Clients », « Patients », « Élèves » */
        customerTitle: capitalize(plural(customer)),
        /** « Client », « Patient » */
        customerSingularTitle: capitalize(customer),
        /** « client », « patient » */
        customerSingular: customer,
        /** « clients », « patients » */
        customerPlural: plural(customer),
        /** Formes accordées : customer.newTitle (« Nouvel élève »), customer.none… */
        customer: forms(customer),

        /** « Formules », « Prestations », « Soins » */
        serviceTitle: capitalize(plural(service)),
        /** « Formule », « Prestation » (bouton « + Formule ») */
        serviceSingularTitle: capitalize(service),
        /** « formules », « prestations » */
        servicePlural: plural(service),
        /** Formes accordées : service.newTitle (« Nouvelle formule »), service.none… */
        service: forms(service),

        /** Le commerce compte-t-il des personnes par réservation (couverts, joueurs) ? */
        showParty: party !== null,
        /** « Couverts » */
        partyTitle: party ? capitalize(plural(party)) : '',
        /** « 1 couvert », « 4 couverts » */
        partyCount: (n: number) => (party ? `${n} ${n > 1 ? plural(party) : party}` : String(n)),
    }
}

export type BookingLabels = ReturnType<typeof bookingLabels>
