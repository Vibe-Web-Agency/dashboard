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

### Grappes d'écrans

Chaque grappe correspond à un domaine du schéma : elle se teste seule.

| # | Grappe | Écrans | Taille |
| --- | --- | --- | --- |
| G1 | Commerce & équipe | `settings` (812), `team` (354) | L |
| G2 | Clients | `clients` (681), `crm` (652) | L |
| G3 | Activité | `reservations` (757), `reservations/[id]` (437), `calendar` (493) | L |
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

## Dette indépendante, à ne pas perdre

- **Purge des données.** La politique de confidentialité de FiFi annonce 12 et
  13 mois ; rien ne l'applique. Seul endroit du site qui affirme un fait faux.
- **Fuite en production.** La clé anon lit toutes les réservations de tous les
  clients. Se règle à la bascule, ou avant sur l'ancien schéma.
- **`feat/produits-factures`** : écrite sur l'ancien schéma, à jeter ou à
  reprendre à la main.
- **Rien n'écrit dans `audit_log`.**

## Ce qui reste à lancer à la main

- `supabase/manual/rappels-par-commerce.sql` — le plus pressé : sans lui, FiFi
  reçoit des rappels SMS non demandés dès sa première réservation.
- `supabase/manual/fifi-prod.sql`
- `supabase/manual/nettoyage-test-debit.sql`
- `supabase/manual/suppression-adboots.sql`
