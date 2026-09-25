/**
 * Heure de Paris, sans décalage codé en dur.
 *
 * Le cron des rappels calculait ses bornes avec `+2h`, avec le commentaire
 * « heure française en été ». C'est vrai six mois par an. Le reste du temps,
 * Paris est à UTC+1 : les bornes de la journée étaient décalées d'une heure,
 * et l'heure annoncée aux clients dans le SMS était fausse d'autant.
 *
 * Tout passe donc par `Intl`, qui connaît les règles de changement d'heure et
 * les met à jour avec le système. Aucune date de bascule n'est écrite ici :
 * une date écrite en dur, c'est la même erreur repoussée d'un an.
 */

export const PARIS = "Europe/Paris";

/** Décalage de Paris par rapport à UTC, à un instant donné, en millisecondes. */
function offsetMs(utcMs: number): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: PARIS,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(new Date(utcMs));

    const v = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    // À minuit, `hour` peut valoir 24 selon les moteurs.
    const hour = v("hour") === 24 ? 0 : v("hour");
    return Date.UTC(v("year"), v("month") - 1, v("day"), hour, v("minute"), v("second")) - utcMs;
}

/**
 * Bornes UTC de la journée parisienne contenant `now`.
 *
 * Deux passes : le décalage dépend de l'instant, et l'instant dépend du
 * décalage. La première approximation suffit à tomber dans le bon régime
 * horaire, la seconde corrige la nuit du changement d'heure.
 */
export function parisDayBounds(now: Date = new Date()): { start: Date; end: Date } {
    const nowMs = now.getTime();
    const localMs = nowMs + offsetMs(nowMs);
    const local = new Date(localMs);

    const toUtc = (y: number, m: number, d: number, h: number, min: number, s: number, ms: number) => {
        const naive = Date.UTC(y, m, d, h, min, s, ms);
        let utc = naive - offsetMs(naive);
        utc = naive - offsetMs(utc);
        return new Date(utc);
    };

    const y = local.getUTCFullYear();
    const m = local.getUTCMonth();
    const d = local.getUTCDate();

    // La borne haute se déduit du minuit SUIVANT, moins une milliseconde.
    // La calculer en posant 23:59:59.999 perdrait les millisecondes, que le
    // décalage horaire n'exprime qu'à la seconde près.
    const start = toUtc(y, m, d, 0, 0, 0, 0);
    const nextMidnight = toUtc(y, m, d + 1, 0, 0, 0, 0);

    return { start, end: new Date(nextMidnight.getTime() - 1) };
}

/** « mardi 14 octobre », dans le fuseau du restaurant. */
export function parisDateLabel(date: Date): string {
    return new Intl.DateTimeFormat("fr-FR", {
        timeZone: PARIS,
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(date);
}

/** « 20h30 », dans le fuseau du restaurant. */
export function parisTimeLabel(date: Date): string {
    return new Intl.DateTimeFormat("fr-FR", {
        timeZone: PARIS,
        hour: "2-digit",
        minute: "2-digit",
    })
        .format(date)
        .replace(":", "h");
}
