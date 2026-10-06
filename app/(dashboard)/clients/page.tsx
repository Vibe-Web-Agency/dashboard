import { redirect } from "next/navigation";

// La base clients V2 vit sous /customers (CLAUDE.md 5.1) ; on garde /clients pour les anciens liens et favoris.
export default function ClientsRedirect() {
    redirect("/customers");
}
