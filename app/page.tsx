/**
 * Page d'attente, le temps de la refonte.
 *
 * Elle existe pour que l'application ait une route et se lance : sans elle,
 * `npm run dev` ouvre sur un 404 et on ne sait pas si le serveur tourne.
 * Elle disparaîtra avec le premier écran réel.
 *
 * La production, elle, tourne toujours sur `main` et l'ancienne base.
 */
export default function Home() {
  return (
    <main className="p-12 leading-relaxed">
      <h1 className="rounded-md bg-brand px-4 py-2 text-lg font-medium text-brand-contrast inline-block">
        Dashboard — refonte en cours
      </h1>
      <p className="mt-6 text-neutral-600">
        L’interface est en cours de reconstruction sur le schéma v2.
        <br />
        Les routes d’API, les crons et l’outillage de base sont conservés.
      </p>
    </main>
  );
}
