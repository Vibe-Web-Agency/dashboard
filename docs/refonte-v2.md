# Refonte du dashboard sur le schéma v2

Document de travail. Une tâche = une branche = une PR. On coche au fur et à
mesure, on réordonne si la réalité l'impose.

## L'état des lieux, chiffré

```
61 pages    dont 22 ébauches de 37 lignes (« à venir »)
30 pages    lisent réellement la base
34 routes d'API
27 500 lignes
```

Le vrai dashboard, c'est une **trentaine d'écrans**, pas soixante.

## Trois décisions prises d'avance

**Les 22 ébauches ne sont pas réécrites, elles disparaissent.**
`chatbot`, `geo-ai`, `whatsapp`, `meta-ads`, `loyalty`, `sms`, `social`,
`ads`, `seo`, `finance`, `invoicing`, `giftcards`, `multilingual`,
`auto-replies`, `workspace`, `messaging`, `google-ads`, `reputation`, `ai`,
`accounting`, `content`… sont des pages vides qui occupent une entrée de menu.
En v2 la navigation se **génère** depuis `business_module_settings` : un
client ne voit que les modules qu'il a. Un tiers de l'application part sans
rien perdre, et c'est précisément le comportement white label recherché.

**On refait dans ce dépôt, sur `develop`.** La production reste sur `main` et
l'ancienne base jusqu'à la bascule. Deux applications en parallèle, ce serait
deux fois la maintenance pendant des semaines, alors que la mise en page, le
thème et les composants d'interface se réutilisent.

**L'ancienne base n'est pas touchée pendant le chantier.** Sauf incident
client. Le travail se fait contre le projet Supabase de dev (`vwa-platform-dev`).

## Ordre des tâches

L'ordre n'est pas négociable sur les fondations : rien ne peut avancer avant
elles. Il l'est sur les grappes, qu'on peut réordonner selon les besoins
clients.

### Fondations

| # | Tâche | Pourquoi d'abord |
| --- | --- | --- |
| F1 | Compte de connexion en dev : script créant un compte d'auth, son profil et son adhésion | Sans compte, aucun écran ne s'affiche. Le seed n'en crée volontairement pas. |
| F2 | `useUserProfile` réécrit sur `memberships` | Chaque écran a besoin de « quel commerce, quel rôle ». Rend aujourd'hui UN commerce, rendra une liste. |
| F3 | Sélecteur de commerce, commerce actif mémorisé | Découle de F2. Règle le cas du client à plusieurs sociétés. |
| F4 | Navigation générée depuis les modules activés | Supprime les 22 ébauches. |
| F5 | Types v2 : `database.v2.types.ts` devient la référence, l'ancien part | Évite de coder contre deux schémas. |
| F6 | Authentification : `/login`, mot de passe oublié, choix du mot de passe, déconnexion, garde rallumée | La garde était coupée faute de `/login`. **Fait.** |
| F7 | Environnement local séparé de la production | `.env.local` pointait sur la base des clients. **Fait.** |
| F8 | Coque : sélecteur de commerce, menu piloté par `enabled_modules` | **Fait.** |
| F9 | Profil partagé par contexte (`FournisseurUtilisateur`) | Chaque écran rechargeait le sien. **Fait.** |

### Grappes d'écrans

Chaque grappe correspond à un domaine du schéma : elle se teste seule.

| # | Grappe | Écrans | Taille |
| --- | --- | --- | --- |
| G1 | Commerce & équipe | `settings` (812), `team` (354) | L |
| G2 | Clients | `clients` (681), `crm` (652) | L — **liste et fiche faites** |
| G3 | Activité | `reservations` (757), `reservations/[id]` (437), `calendar` (493) | L — **liste, calendrier 3 vues, glisser-déposer et création : faits** |
| G4 | Catalogue | `products` (291), `services` (287), `orders` (470) | M |
| G5 | Facturation | `quotes` (386), `quotes/[id]` (472), `billing` (372) | L — **devis : liste et fiche faites** |
| G6 | Contenu | `blog` (346) | S — **fait** |
| G7 | Communication | `messages`, `campaigns` (212), `reviews` (307) | M |
| G8 | Statistiques | `stats` (916), `analytics` (368) | L |
| G9 | Talents & projets | `people` (588), `projects` (570) | M |
| G10 | Espace agence | `admin/*` : prospects (915), analytics (550), portfolio (495), stats (459), `[id]` (408), plans, messages, new | XL |

**Priorité conseillée** : G1 → G3 → G2 → G6 → G4 → G7 → G5 → G8 → G9 → G10.

G1 et G3 d'abord parce qu'ils couvrent ce dont Toscana et FiFi se servent
réellement aujourd'hui : les réglages et les réservations. G10 en dernier :
c'est le plus gros, et il ne bloque aucun client.

### Bascule

| # | Tâche | Note |
| --- | --- | --- |
| B1 | Script de migration v1 → v2 | Rejoué autant de fois qu'il faut sur une copie avant le vrai passage. |
| B2 | Adapter les 6 sites clients | Quelques heures chacun. FiFi = un seul fichier. |
| B3 | Bascule : migration, variables d'environnement, redéploiements | Une soirée. Ferme au passage la fuite de la clé anon. |

## Deux manques du schéma, repérés en cadrant les écrans

- **Le vocabulaire « selon le client » n'existe qu'à moitié.**
  `business_types.booking_noun` couvre « réservation » / « rendez-vous » /
  « séance » / « casting ». Mais `modules.label` est **global** : `talents`
  s'affiche « Talents » pour tout le monde, `blog` s'affiche « Blog », et il
  n'y a pas de module `vehicles`. Un loueur verrait donc « Talents » dans son
  menu. À traiter avant la grappe Talents (G9) : soit des colonnes de libellés
  sur `business_types`, soit une table de liaison
  `business_type_modules.label_override`.
- **Le coupe-circuit de l'abonnement n'est pas branché.** `has_feature`
  accorde l'accès si le plan est `trialing`, `active` **ou `past_due`** —
  c'est bien le mois de grâce voulu. Mais rien ne fait passer `past_due` à
  `expired` : un impayé garde l'accès indéfiniment. Il manque un travail
  planifié, à écrire avec la grappe Facturation (G5).

## Vitrine publique : une démo, pas le vrai tableau de bord

Décidé le 28/09/2026. L'objectif est que des prospects et des agences
intéressées par la marque blanche puissent manipuler le produit sans compte.

Ce ne sera **pas** le tableau de bord réel ouvert au public. D'abord parce que
les politiques RLS refusent tout sans `auth.uid()` : un visiteur non connecté
ne verrait que des écrans vides, ce qui ne vend rien. Ensuite parce que les
remplir demanderait de contourner RLS, donc de publier les réservations, les
fiches clients et le chiffre d'affaires de vrais clients.

Forme retenue, **faite** : une route `/demo` publique, avec un jeu de données
écrit dans `lib/demo.ts`, branché sur rien. Un visiteur non connecté qui
arrive sur `/` y est envoyé ; toute autre page mène à la connexion, en
mémorisant la page demandée.

Point de construction important : la démo et le vrai tableau de bord
partagent `CoqueVue` et `Tableau`. Deux composants séparés auraient divergé
en quelques semaines, et la démo aurait fini par montrer un produit qui
n'existe plus. Seule la source des données change.

`scripts/ui-tests/demo.mjs` vérifie qu'aucune requête ne part vers Supabase
depuis la démo — c'est la garantie qui compte, et elle ne se voit pas à
l'œil.

Reste à faire quand les vrais écrans existeront : remplacer les jeux de
`ECRANS_DEMO` par des extraits des mêmes composants d'écran, pour que la démo
suive automatiquement.

## Le jeu de dev pourrit

Le seed pose des dates relatives (`now() + interval '1 day'`), figées à
l'instant du chargement. Une semaine plus tard, plus rien n'est « à venir » :
l'écran des réservations paraît cassé alors qu'il dit la vérité. Le piège
vaudra pour le calendrier, les statistiques et les campagnes.

`npm run db:dates` recale les dates sans toucher au reste. À lancer en
reprenant le travail, plutôt qu'un `db:reset` complet.

## Le schéma v2 n'a AUCUNE politique pour le rôle anonyme

Constaté en construisant le journal : pas une seule politique `to anon` dans
tout le schéma. Aucun site client ne peut donc rien lire avec la clé anon —
ni blog, ni carte, ni prestations, ni talents.

Ce n'est pas un oubli à réparer, c'est le bon choix, et il correspond
exactement à ce qu'on a fait des sites le 29/09 : ils lisent tous depuis
leur serveur, avec la clé de service. La clé anon ne quitte plus le
navigateur de personne.

À écrire noir sur blanc au moment de la bascule (B2), sinon quelqu'un
cherchera pourquoi le blog ne s'affiche plus et rouvrira une politique
publique.

## Journal : ce qui manque encore

- **Le seau de stockage `blog`** doit exister côté Supabase pour que le
  téléversement des couvertures fonctionne. L'écran le dit clairement s'il
  manque, il ne se contente pas d'un « Bucket not found ».
- **L'aperçu du rendu.** Le contenu est du texte libre (markdown ou html
  selon le schéma) et s'édite à l'aveugle.
- **Les étiquettes** existent en base, l'éditeur ne les propose pas.
- **La programmation.** `published_at` se pose à la publication ; rien ne
  permet de dater un article dans le futur.

## Un principe posé en construisant l'écran Clients

Le menu doit refléter ce que la BASE autorise, pas ce qu'on voudrait.

`/clients` était réservé aux membres dans la navigation, alors que la
politique de lecture de `customers` autorise les lecteurs. Masquer l'entrée
ne protégeait rien : l'adresse restait tapable et la base répondait. Ça ne
servait qu'à croire le trou fermé — et c'est pire qu'un menu permissif,
parce qu'on cesse de regarder.

Le rôle sert à masquer ce qui serait de toute façon refusé, jamais à
inventer une règle que la base ignore.

## Clients : ce qui manque encore

- **Créer ou modifier une fiche à la main.** Elles se créent seules à la
  première réservation, mais on ne peut ni corriger un nom mal orthographié
  ni fusionner deux fiches — or le rapprochement par téléphone laisse
  passer des doublons dès qu'un habitué appelle d'un autre numéro.
- **L'effacement RGPD.** `anonymized_at` existe et la fiche le respecte,
  mais rien ne déclenche l'effacement. Une demande de suppression n'a donc
  aucune réponse outillée.
- **Les campagnes.** La v1 permettait d'écrire à la liste filtrée. C'est le
  module `campaigns`, pas celui-ci — mais le lien devra exister.
- **`crm` de la v1** (652 lignes) n'a pas été regardé : à voir s'il contient
  quelque chose que `clients` n'a pas.

## Devis : ce qui manque encore

La liste et la fiche sont faites. Ce qui suit ne l'est PAS, et un devis ne
sert pas à grand-chose sans :

- **L'éditeur de lignes.** `quote_items` existe et s'affiche, mais rien ne
  permet d'ajouter, modifier ou supprimer une ligne. C'est le cœur du
  métier : sans lui, on ne chiffre pas. Les totaux se recalculent à partir
  des lignes — la contrainte `total = subtotal - discount + tax` est en
  base, donc le calcul doit être exact, pas approché.
- **L'envoi au client.** Le bouton « Envoyer » change le statut et attribue
  un numéro, mais n'envoie rien. Il faut un PDF et un e-mail — et un lien de
  consultation pour que `viewed_at` veuille dire quelque chose.
- **La création depuis le tableau de bord.** On ne peut traiter que ce qui
  arrive du site. Un devis démarré au téléphone n'a pas d'entrée.
- **La note interne** s'affiche mais ne se modifie pas.
- **`valid_until`** n'est ni affiché ni réglable, alors que le statut
  `expired` existe. Rien ne fait expirer un devis aujourd'hui.
- **La suppression**, absente. La v1 l'avait.

Remarque de conception à trancher avant l'éditeur : une demande (`request`)
et un devis chiffré partagent la même table. C'est pratique pour le suivi,
mais l'écran devra afficher deux choses assez différentes. Si ça devient
confus, la sortie est de séparer les deux VUES, pas les deux tables.

## Ce qu'on a appris en portant plutôt qu'en réécrivant

L'écran Devis a été PORTÉ depuis la v1, pas réécrit. La v1 avait quatre
choses qu'on n'aurait pas pensé à mettre et qui servent tous les jours : la
mise à jour en temps réel, la recherche dans le message du client, l'export
CSV avec point-virgule (Excel français) et la pagination.

C'est la méthode à garder pour les écrans restants — clients, blog,
talents. Les réservations et le calendrier valaient la réécriture, ils sont
le cœur du produit ; une liste avec un formulaire, non.

## Dette indépendante, à ne pas perdre

- **Purge des données.** La politique de confidentialité de FiFi annonce 12 et
  13 mois ; rien ne l'applique. Seul endroit du site qui affirme un fait faux.
- **Fuite en production.** La clé anon lit toutes les réservations de tous les
  clients. Se règle à la bascule, ou avant sur l'ancien schéma.
- **`feat/produits-factures`** : écrite sur l'ancien schéma, à jeter ou à
  reprendre à la main.
- **Rien n'écrit dans `audit_log`.** Le déplacement d'une réservation en est
  le premier cas qui le mériterait : la base ne garde aucune trace de
  l'ancienne heure, et la route de notification doit donc se la faire passer
  par l'appelant.
- **Les gabarits d'e-mail de la v1 utilisent `var(--accent)`**, que la
  plupart des clients de messagerie ne savent pas lire : la couleur y tombe
  en noir, sans que ça se voie côté tableau de bord. À reprendre quand on
  touchera aux rappels.
- **Le glisser-déposer n'a pas d'équivalent au clavier.** La modification
  passe alors par le détail de la réservation, ce qui reste faisable mais
  plus long. Un déplacement au clavier serait à ajouter.
- **La recherche ne couvre que les écrans** dans le vrai tableau de bord.
  Chaque écran construit devra alimenter `ElementRecherche` avec ses données,
  comme le fait déjà la démo.
- **Cookie de session non `httpOnly`.** Inhérent à `createBrowserClient` :
  c'est du JavaScript qui l'écrit. Une faille XSS dans le tableau de bord
  permettrait donc de voler une session. Le corriger demande de passer
  l'authentification en *server actions* uniquement.
- **`.env.production.backup`** : l'ancien fichier unique, qui mélangeait dev
  et production. À supprimer une fois vérifié que Vercel porte bien toutes
  ses variables.
- **Inscription publique à couper** dans les réglages Supabase Auth : la route
  `/api/auth/signup` a été supprimée, mais l'API d'authentification accepte
  encore les inscriptions. Les comptes ne doivent venir que des invitations.

## Ce qui reste à lancer à la main

- `supabase/manual/rappels-par-commerce.sql` — le plus pressé : sans lui, FiFi
  reçoit des rappels SMS non demandés dès sa première réservation.
- `supabase/manual/fifi-prod.sql`
- `supabase/manual/nettoyage-test-debit.sql`
- `supabase/manual/suppression-adboots.sql`
