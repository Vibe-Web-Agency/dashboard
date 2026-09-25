-- ═════════════════════════════════════════════════════════════════════════
--  Suppression du projet AD Boots — base de PRODUCTION
--
--  Contexte : collaboration terminée, site déjà hors ligne (ad-boots.com
--  répond 404), aucune commande réelle donc aucune facture émise.
--
--  ⚠️ IRRÉVERSIBLE. Déroule les étapes dans l'ordre : une seule requête à la
--  fois, en lisant le résultat avant de passer à la suivante.
--
--  business_id : f9e291c2-0fea-4b24-8abb-57264e001cd3
-- ═════════════════════════════════════════════════════════════════════════


-- ─── ÉTAPE 1 — Vérifier ce qu'on s'apprête à détruire ────────────────────
--
-- « Aucune commande » signifie aucune commande PAYÉE. Le site créait une
-- ligne `orders` avant même le paiement : chaque panier abandonné et chaque
-- test de développement en a laissé une. Cette requête te dit ce qu'il y a
-- vraiment. Si une ligne ressort avec un statut « paid » ou équivalent,
-- ARRÊTE-TOI : il y a eu une vente, et donc une facture à conserver.

select status, count(*) as lignes, min(created_at) as premiere, max(created_at) as derniere
  from orders
 where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3'
 group by status
 order by lignes desc;

-- Vérifie aussi qu'aucune facture n'a été enregistrée :
select count(*) as factures
  from invoices
 where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3';

-- Et ce qui référence encore ce commerce ailleurs :
select 'products' as table_, count(*) from products where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3'
union all select 'sessions', count(*) from sessions where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3'
union all select 'users',    count(*) from users    where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3';


-- ─── ÉTAPE 2 — Supprimer, des feuilles vers la racine ────────────────────
--
-- L'ordre n'est pas décoratif : la ligne `businesses` est référencée par
-- toutes les autres. La supprimer en premier déclenche l'erreur de clé
-- étrangère que tu as déjà rencontrée.

delete from invoices where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3';
delete from orders   where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3';
delete from products where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3';
delete from sessions where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3';
delete from users    where business_id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3';

-- En dernier seulement :
delete from businesses where id = 'f9e291c2-0fea-4b24-8abb-57264e001cd3';

-- Si cette dernière ligne échoue encore, c'est qu'une table que je n'ai pas
-- listée y fait référence. Le message d'erreur nomme la contrainte fautive :
-- envoie-le-moi plutôt que de chercher à forcer.


-- ─── ÉTAPE 3 — Le Storage ne suit PAS ────────────────────────────────────
--
-- Les PDF vivent dans le bucket `invoices`, sous le préfixe `adboots/`.
-- Aucune suppression SQL ne les touche : ils resteront là, facturés, et
-- accessibles selon les règles du bucket. À vider depuis l'interface
-- Supabase (Storage → invoices → dossier adboots → supprimer).

-- ─── ÉTAPE 4 — Hors base de données ──────────────────────────────────────
--
--  [ ] Stripe : supprimer le point de terminaison du webhook. Il pointe sur
--      un site qui n'existe plus ; sans ça, les tentatives échouées
--      s'accumulent dans le tableau de bord.
--  [ ] Stripe : les paiements de test restent, c'est normal et sans effet.
--  [ ] Resend : retirer le domaine ad-boots.com.
--  [ ] Vercel : supprimer le projet.
--  [ ] Registraire : décider du sort du domaine (laisser expirer ou céder).
--  [ ] Supabase Auth : supprimer les 2 comptes orphelins d'AD Boots.
--  [ ] GitHub : ARCHIVER le dépôt plutôt que le supprimer — c'est gratuit,
--      ça le gèle en lecture seule, et l'historique reste si le client
--      revient demander quelque chose.
