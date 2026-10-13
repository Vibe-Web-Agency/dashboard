# Reste à faire

État au 2026-10-13, branche `develop`. Classé par priorité : ce qui rapporte le plus pour le moins d'effort en premier.
Le détail technique de chaque sujet est dans `CLAUDE.md` (sections indiquées).

**Effort :** S = moins d'une heure · M = une demi-journée · L = un jour ou plus.
**Qui :** « Vous » = ne peut être fait que par vous (accès, comptes, décisions) · « Code » = à développer.

---

## 1. À faire tout de suite (débloque le reste)

| # | Quoi | Pourquoi | Qui | Effort |
|---|---|---|---|---|
| 1 | ~~Pousser `develop`.~~ **Fait le 2026-10-13.** | — | — | — |
| 2 | **Vous inscrire dans `platform_admins`** (une ligne avec votre `profile_id`). | L'espace `/admin` n'a jamais été ouvert : clients, invitations, prospects, tâches, support et plans ne sont testés que côté données. | Vous | S |
| 3 | **Clé Google Places** : la restreindre à « Places API (New) », poser un plafond de quota, puis la mettre dans `.env.local` et Vercel (`GOOGLE_PLACES_API_KEY`). | Le texte des avis Google arrive avec cette clé (vérifié). Elle a été collée dans une conversation : à restreindre, idéalement à régénérer. | Vous | S |
| 4 bis | **Renseigner l'email de contact de l'agence** (`agencies.contact_email` de Vibe Web Agency). | C'est là qu'arrivent les alertes de nouvelle demande de support. | Vous | S |
| 4 | **Relier FiFi à sa fiche Google** depuis la page Avis (recherche par nom). | Note et avis Google visibles aussitôt. | Vous | S |

## 2. Avant d'ouvrir à un vrai client

| # | Quoi | Pourquoi | Qui | Effort |
|---|---|---|---|---|
| 5 | **Cliquer dans le dashboard, sur ordinateur et sur téléphone.** L'affichage est vérifié (2026-10-13) : 20 pages à 375, 768 et 1 280 px dans un vrai navigateur, sans débordement, avec les corrections faites sur les réservations, les demandes, la carte, la fiche client et les en-têtes. Restent à essayer à la main : le menu mobile, les formulaires, les boutons, et tout l'espace `/admin` (non vérifié, faute d'accès admin). | Les interactions n'ont jamais été essayées en vrai. | Vous, puis Code pour corriger | M |
| 6 | **Premier envoi réel d'email** : une invitation, une confirmation de réservation, un devis avec son PDF. | Aucun email n'est parti pendant les tests. À confirmer : la clé Resend et le domaine d'expédition `vibewebagency.fr`. | Vous | S |
| 7 | **Rejouer les scripts SQL sur la base de production** (`supabase/manual/`, sauf les `dev-*.sql`). Les plus récents : `rls-hardening`, `handle-new-user-invited`, `api-rate-limits`, `quotes-seller-buyer`, `clarity-daily-metrics`, `businesses-freeze-google-listing`, `profiles-names-status` (à jouer après `handle-new-user-invited`, dont il reprend le trigger), puis `drop-full-name-columns` **en tout dernier** (irréversible). | La production n'a reçu aucune des corrections. L'état de sa base n'a pas été relevé : à comparer avant de rejouer. | Vous, avec Code | M |
| 8 | **Variables d'environnement sur Vercel** : `CRON_SECRET`, `RESEND_API_KEY`, `GOOGLE_PLACES_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` ; `TWILIO_*` seulement si les SMS servent. | Sans `CRON_SECRET`, ni rappels ni relevés ne tournent. | Vous | S |
| 9 | **Vérifier les deux tâches planifiées sur Vercel** (`vercel.json` : 7 h et 23 h UTC). | Jamais déclenchées en vrai. Le nombre de tâches autorisé dépend de votre offre Vercel. | Vous | S |
| 10 | **Vérifier que les sites clients passent par `/api/v1/public/*`.** | Depuis le durcissement RLS, un site qui écrit directement dans `reservations`, `customers`, `orders` ou la messagerie avec la clé publique est refusé (section 1.3). | Vous | S |

## 3. À régler pour chaque client, à sa mise en route

Réglages, pas du code. Pour chacun des quatre premiers clients :

- **Site ou origines autorisées** (`businesses.website_url` / `allowed_origins`) : tant que c'est vide, son API publique accepte toutes les origines (9.2).
- **Email de l'établissement** : c'est là qu'arrivent les avis de nouvelle réservation ou demande (9.3).
- **Mentions légales des devis** dans Paramètres : SIRET, TVA, forme juridique (9.4).
- **Clarity** : identifiant du projet et jeton sur la page Analyse web (9.8).
- **Fiche Google** depuis la page Avis (9.9). Le choix est **définitif** pour le client : pour la changer, vous la déliez depuis `/admin` → sa fiche → « Fiche Google ».
- **Plan et modules** depuis `/admin` : sans plan, seuls les modules de base apparaissent.
- **SMS de rappel** : si le client paie pour des SMS, lui donner un quota depuis `/admin` → sa fiche → « SMS de rappel ». Sans quota, aucun SMS ne part pour lui.

## 4. Développements utiles, par rendement

| # | Quoi | Ce que ça apporte | Effort |
|---|---|---|---|
| 11 | **Corrections issues du passage en navigateur** (point 5). | Probablement le plus rentable : ce sont les défauts que vos clients verraient. | M |
| 12 | ~~Email à l'agence pour chaque nouvelle demande de support.~~ **Fait le 2026-10-13.** L'email part vers `agencies.contact_email`, qui est **vide** pour Vibe Web Agency : à renseigner, sinon rien n'est envoyé. | — | — |
| 13 | ~~Libellés de statut accordés.~~ **Fait le 2026-10-13** : « Confirmé », « Annulé » pour un rendez-vous ; « Confirmée », « Annulée » pour une réservation. | — | — |
| 14 | ~~Page d'acceptation du devis en ligne.~~ **Fait le 2026-10-13** : le client ouvre son devis par un lien, l'accepte ou le refuse, et le commerce est prévenu. | — | — |
| 15 | **Connexion Google du commerce** (tous les avis, réponse depuis le dashboard). | Bloqué tant que Google n'a pas accordé l'accès : activer les deux API « My Business », envoyer le formulaire d'accès, créer l'identifiant OAuth (9.9). | L |
| 16 | **Planning de l'équipe** et lien employé ↔ prestation. | Permet de réserver « avec telle personne ». Utile surtout aux coiffeurs et instituts. | L |
| 17 | ~~Tests automatiques.~~ **Fait le 2026-10-13** : `npm test`, 40 tests (`tests/README.md`). | — | — |
| 18 | ~~Statistiques et fiche client enrichies.~~ **Fait le 2026-10-13** (CLAUDE.md 9.11) : couverts, moyenne par réservation, midi / soir, heures, tailles de groupe, provenance, évolution ; sur la fiche : habitudes, notes internes, étiquettes, prochaine réservation. Les blocs suivent le secteur du commerce. | — | — |
| 19 | **Découpages propres à d'autres secteurs** (`lib/v2/verticals.ts`). | Aujourd'hui seule la restauration a le sien (midi / soir) ; les autres ont matin / après-midi / soir. À affiner quand un client d'un autre secteur arrive (ex. chiffre d'affaires par prestation pour un coiffeur, quand les prix seront rattachés aux réservations). | S |

## 5. Décisions en attente

Aucune ne bloque aujourd'hui, mais chacune conditionne un chantier.

- **Boutique** : un de vos clients vend-il en ligne ? Si oui, paiement Stripe ou commande à régler sur place ? Rien n'est fait, et un site ne peut plus créer de commande directement.
- **Campagnes email / SMS** : utile maintenant, ou reporté ? Demande un lien de désinscription et un domaine d'expédition par commerce.
- **Paiement de l'abonnement** : vous facturez vous-même, ou Stripe dans le dashboard ? Seul l'affichage du plan existe.
- **Plans** : communs à toutes les agences, ou un jeu par agence ? Il existe aujourd'hui deux « Pro » (6.4).
- **Suivi maison des visites** (`sessions`) : le garder à côté de Clarity, ou le retirer ?
- **Devis** : prix saisis hors taxes avec 20 % de TVA par défaut. Vos clients raisonnent-ils en TTC ?
- **Avis Google** : par Places, seuls les 5 avis du jour sont gardés, pour respecter les conditions de Google. Acceptable en attendant la connexion Google ?
- **Seuils d'alerte Clarity** (3, 15, 15, 10 et 5 % des visites) : fixés arbitrairement, à ajuster.
- **Fiche client** : une fiche est « à relancer » quand le client n'est pas venu depuis plus de deux fois son rythme habituel et plus de 30 jours. Seuil à ajuster ? Et faut-il un bouton pour bloquer un client (la colonne `is_blocked` existe, rien ne l'applique) ?
- **Données publiques** : `talents.date_of_birth` est lisible par un visiteur pour les profils actifs ; `agency_plan_modules` est lisible par tous.

## 6. Ménage

Fait le 2026-10-13 : dépendances inutilisées retirées (`stripe`, `twilio`, `resend`, `recharts`, `googleapis`), route `/api/revalidate-iconik` supprimée, erreurs de lint corrigées, `db.md` complété, sections 6.2 et 6.3 de `CLAUDE.md` marquées comme historiques.

Les colonnes `customers.full_name` et `profiles.full_name` ont été supprimées de la base de dev (`drop-full-name-columns.sql`).

---

## Pour reprendre demain

1. Points 1 à 4 (une demi-heure en tout).
2. Point 5 : ouvrir chaque page sur ordinateur puis sur téléphone, et noter ce qui ne va pas.
3. Corriger ce qui ressort (point 11), puis enchaîner sur les points 6 à 10 avant d'ouvrir à un client.
