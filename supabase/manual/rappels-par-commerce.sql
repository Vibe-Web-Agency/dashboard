-- ═════════════════════════════════════════════════════════════════════════
--  Rappels automatiques : un réglage par commerce — base de PRODUCTION
--
--  Le cron ramasse toutes les réservations du lendemain, TOUS commerces
--  confondus, et envoie un SMS + un e-mail. Il n'existe aucun moyen de
--  choisir qui en bénéficie. Concrètement, un restaurant qui vient de
--  mettre son site en ligne voit partir des SMS à ses clients sans avoir
--  rien demandé — et chaque SMS est facturé.
--
--  Cette colonne est une solution d'attente. En v2, c'est
--  `business_module_settings.is_enabled` qui porte ce choix, par module.
--
--  À coller dans l'éditeur SQL de Supabase, projet « VWA Dashboard ».
--  Le code fonctionne avant ET après : tant que la colonne n'existe pas, il
--  relit sans elle et considère tout le monde comme actif, soit le
--  comportement actuel. L'ordre déploiement / migration est donc libre.
-- ═════════════════════════════════════════════════════════════════════════


-- ─── 1. La colonne ───────────────────────────────────────────────────────
--
-- Par défaut à `true` : les commerces qui reçoivent déjà des rappels
-- continuent d'en recevoir. Une valeur par défaut à `false` couperait le
-- service de tout le monde au moment du déploiement, sans prévenir.

alter table public.businesses
  add column if not exists reminders_enabled boolean not null default true;

comment on column public.businesses.reminders_enabled is
  'Envoi des rappels automatiques de réservation (SMS + e-mail). Provisoire : remplacé en v2 par business_module_settings.';


-- ─── 2. État des lieux avant de décider ──────────────────────────────────
-- Qui reçoit des rappels aujourd'hui, et combien de réservations à venir.

select b.name,
       b.reminders_enabled,
       count(r.id) filter (where r.date >= now()) as reservations_a_venir
  from businesses b
  left join reservations r on r.business_id = b.id
 group by b.id, b.name, b.reminders_enabled
 order by reservations_a_venir desc;


-- ─── 3. Couper les rappels pour FiFi ─────────────────────────────────────
--
-- Le restaurant n'a pas souscrit aux rappels. Tant que ce n'est pas un choix
-- explicite de sa part, on n'envoie rien : un SMS non demandé abîme la
-- relation qu'il vient tout juste d'ouvrir avec ses clients.

update businesses
   set reminders_enabled = false
 where id = '05717a67-b353-4775-af7a-2afafcef570b';

-- Doit renvoyer UPDATE 1.


-- ─── 4. Vérification ─────────────────────────────────────────────────────
select name, reminders_enabled
  from businesses
 order by reminders_enabled desc, name;
