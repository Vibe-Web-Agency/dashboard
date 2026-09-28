import { Coque } from "@/components/Coque";

/**
 * Tout ce qui est dans ce groupe de routes est connecté et entouré de la
 * coque. Les écrans publics — connexion, mot de passe, et la future démo —
 * restent en dehors, à la racine de `app/`.
 *
 * Le groupe `(app)` ne se voit pas dans les URL : `app/(app)/page.tsx` sert
 * bien `/`.
 */
export default function LayoutApplication({ children }: { children: React.ReactNode }) {
  return <Coque>{children}</Coque>;
}
