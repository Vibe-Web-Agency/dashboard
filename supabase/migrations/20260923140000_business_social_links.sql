-- Réseaux sociaux d'un commerce.
--
-- FiFi a un Instagram et un TikTok : sans cette colonne, ils ne vivaient que
-- dans le `lib/site.ts` du site, hors de portée du dashboard — donc pas
-- modifiables par le client, et invisibles pour un futur générateur de site.
--
-- jsonb plutôt qu'une colonne par réseau : la liste des réseaux change tous
-- les deux ans. Le contrôle garantit un objet, pas un tableau ni une chaîne ;
-- les URL elles-mêmes sont validées à la saisie.
alter table public.businesses
  add column if not exists social_links jsonb not null default '{}';

alter table public.businesses
  drop constraint if exists businesses_social_links_check;

alter table public.businesses
  add constraint businesses_social_links_check
  check (jsonb_typeof(social_links) = 'object');
