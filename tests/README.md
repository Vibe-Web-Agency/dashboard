# Tests

Tests des parcours qui ne doivent pas casser : droits par rôle, API publique, devis, messages automatiques.
Ils tournent avec le lanceur de tests de Node, sans dépendance de test à part `tsx`.

## Lancer

```bash
npm test
```

Les tests qui interrogent le serveur (page publique d'un devis, API publique) sont **ignorés** tant que `TEST_BASE_URL` n'est pas renseignée.
Pour les inclure, lancer l'application dans un autre terminal, sans clé d'envoi :

```bash
RESEND_API_KEY= TWILIO_AUTH_TOKEN= npx next start -p 3124   # après npx next build
TEST_BASE_URL=http://localhost:3124 npm test
```

## Ce qu'il faut savoir

- **Base de développement uniquement.** Les tests écrivent en base. `tests/helpers.ts` refuse de démarrer si
  `NEXT_PUBLIC_SUPABASE_URL` ne désigne pas le projet de développement.
- **Aucun email, aucun SMS.** Les clés Resend et Twilio sont retirées du processus de test. Un envoi est donc composé,
  inscrit dans `outbound_messages`, puis marqué en échec : c'est ce que les tests vérifient. Lancez aussi le serveur
  sans ces clés, comme ci-dessus, sinon l'API publique enverrait de vrais emails.
- **Ils nettoient derrière eux.** Chaque test marque ce qu'il crée (`autotest-…`) et le supprime à la fin, même en cas d'échec.
- **Comptes utilisés :** `test-auth@vwa.local` (propriétaire) et `lecteur-test@vwa.local` (lecteur de FiFi), ouverts par
  lien magique d'administration. Ils doivent exister dans la base de développement.

## Fichiers

| Fichier | Vérifie |
|---|---|
| `unit.test.ts` | Calculs et lectures sans base : totaux d'un devis, jeton du lien public, origines, lecture des réponses Clarity |
| `access.test.ts` | Ce que le lecteur, le propriétaire et le visiteur anonyme peuvent lire et écrire |
| `quotes.test.ts` | Contenu chiffré, PDF, email, réponse du client, page publique |
| `messages.test.ts` | Confirmation, rappels de la veille, SMS réservés aux offres qui en incluent |
| `public-api.test.ts` | Création par l'API publique, dédoublonnage du client, 400, 404, 403, 429 |

## Tests HTTP : jamais sur le serveur de développement

Les tests qui appellent le serveur (API publique, page publique du devis, PDF) ne tournent que si `TEST_BASE_URL` est renseignée.
Le serveur visé doit être lancé **sans clés d'envoi**, sur un autre port que celui de `npm run dev` :

```bash
npx next build
RESEND_API_KEY= TWILIO_AUTH_TOKEN= NODE_OPTIONS=--use-system-ca npx next start -p 3124
TEST_BASE_URL=http://localhost:3124 npm test
```

Le 2026-10-13, ces tests visaient par défaut le port 3000 : lancés pendant que `npm run dev` tournait, ils ont fait partir
un email de confirmation réel vers une adresse de test (`autotest-…@vwa.local`, domaine inexistant). D'où cette règle.
