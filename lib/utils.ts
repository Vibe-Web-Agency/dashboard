import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Le prénom d'un nom complet, pour tutoyer sans en faire trop.
 *
 * Volontairement naïf : le premier mot. Un nom composé (« Jean-Marc ») passe
 * bien ; un nom rendu à l'envers (« MARTIN Camille ») donnerait « MARTIN ».
 * On préfère ça à une heuristique sur la casse, qui se tromperait autrement.
 */
export function firstNameOf(nomComplet: string): string | null {
  const premier = nomComplet.trim().split(/\s+/)[0];
  return premier || null;
}
