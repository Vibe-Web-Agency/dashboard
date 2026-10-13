import type { Business } from './tenant'

// Ce qui change d'un secteur à l'autre dans les statistiques et la fiche client.
// Le vocabulaire vient de business_types (lib/v2/labels.ts) ; ici, ce sont les découpages propres à une verticale.
// Les blocs « couverts / joueurs » dépendent de party_noun (labels.showParty), pas de la verticale.

/** Moment de la journée : commence à l'heure `from` (incluse), dans le fuseau du commerce. */
export type DayPart = { label: string; from: number }

// Les heures d'avant le premier moment (après minuit) comptent dans le dernier : un service du soir qui déborde.
const FOOD_PARTS: DayPart[] = [{ label: 'Midi', from: 5 }, { label: 'Soir', from: 16 }]
const DEFAULT_PARTS: DayPart[] = [{ label: 'Matin', from: 5 }, { label: 'Après-midi', from: 12 }, { label: 'Soir', from: 18 }]

/** Découpage de la journée du commerce : services du midi et du soir en restauration, matin / après-midi / soir ailleurs. */
export function dayParts(business: Pick<Business, 'business_type'>): DayPart[] {
    return business.business_type.vertical?.slug === 'food' ? FOOD_PARTS : DEFAULT_PARTS
}

/** Rang du moment auquel appartient une heure (0 à 23). */
export function dayPartIndex(parts: DayPart[], hour: number): number {
    let index = parts.length - 1
    for (let i = 0; i < parts.length; i++) if (hour >= parts[i].from) index = i
    return hour < parts[0].from ? parts.length - 1 : index
}

export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

/** Jour de la semaine (lundi = 0) et heure d'un instant, dans le fuseau du commerce. */
export function zonedWeekdayHour(iso: string, timeZone: string): { day: string; weekday: number; hour: number } {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
    const [y, m, d] = [Number(get('year')), Number(get('month')), Number(get('day'))]
    return { day: `${get('year')}-${get('month')}-${get('day')}`, weekday: (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7, hour: Number(get('hour')) % 24 }
}
