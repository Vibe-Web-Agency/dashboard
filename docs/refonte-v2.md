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
| G2 | Clients | `clients` (681), `crm` (652) | L |
| G3 | Activité | `reservations` (757), `reservations/[id]` (437), `calendar` (493) | L — **liste faite** |
| G4 | Catalogue | `products` (291), `services` (287), `orders` (470) | M |
| G5 | Facturation | `quotes` (386), `quotes/[id]` (472), `billing` (372) | L |
| G6 | Contenu | `blog` (346) | S |
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

## Dette indépendante, à ne pas perdre

- **Purge des données.** La politique de confidentialité de FiFi annonce 12 et
  13 mois ; rien ne l'applique. Seul endroit du site qui affirme un fait faux.
- **Fuite en production.** La clé anon lit toutes les réservations de tous les
  clients. Se règle à la bascule, ou avant sur l'ancien schéma.
- **`feat/produits-factures`** : écrite sur l'ancien schéma, à jeter ou à
  reprendre à la main.
- **Rien n'écrit dans `audit_log`.**
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
