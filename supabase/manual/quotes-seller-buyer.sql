-- Devis en PDF : émetteur et destinataire portés par le devis, comme sur `invoices`.
-- À rejouer sur chaque base V2, dont la production.
--
-- `buyer`  : coordonnées du destinataire saisies sur le devis (société, adresse, n° de TVA…).
-- `seller` : copie des informations de l'émetteur prise à l'envoi, pour qu'un devis envoyé ne change plus
--            si le commerce modifie ensuite ses coordonnées.

alter table public.quotes
  add column if not exists buyer  jsonb,
  add column if not exists seller jsonb;

alter table public.quotes drop constraint if exists quotes_buyer_check;
alter table public.quotes add constraint quotes_buyer_check check (buyer is null or jsonb_typeof(buyer) = 'object');
alter table public.quotes drop constraint if exists quotes_seller_check;
alter table public.quotes add constraint quotes_seller_check check (seller is null or jsonb_typeof(seller) = 'object');
