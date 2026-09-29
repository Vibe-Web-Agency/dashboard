/**
 * Lien de désinscription invalide ou expiré.
 *
 * La page existe parce que la route y redirige : sans elle, quelqu'un qui
 * clique un lien abîmé tombe sur une 404 et n'a aucun moyen de se
 * désinscrire. Pour un e-mail commercial, c'est un manquement.
 */
export default function DesinscriptionImpossible() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
            <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
                <h1 className="text-lg font-semibold text-zinc-900">
                    Ce lien de désinscription n&apos;est pas valide
                </h1>
                <p className="mt-2 text-sm text-zinc-600">
                    Il a peut-être été tronqué par votre messagerie. Répondez simplement
                    « STOP » à l&apos;e-mail que vous avez reçu : nous vous retirerons de la
                    liste.
                </p>
            </div>
        </main>
    );
}
