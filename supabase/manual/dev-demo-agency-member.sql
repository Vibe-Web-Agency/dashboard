-- ═════════════════════════════════════════════════════════════════════════
--  DEV UNIQUEMENT — donner un membre à l'agence du commerce de démo
--
--  « client-demo » appartient à une agence qui n'avait aucune membership
--  active : aucun compte ne pouvait ouvrir la démo. On rattache le compte de
--  test `test-auth@vwa.local` comme owner de cette agence (business_id NULL :
--  accès à tous ses commerces).
--
--  Rejouable : ne crée rien si la membership existe déjà.
--  Appliqué sur la base de DEV le 2026-10-06. NE PAS jouer en production.
-- ═════════════════════════════════════════════════════════════════════════

insert into public.memberships (profile_id, agency_id, business_id, role, is_active)
select p.id, b.agency_id, null, 'owner', true
  from public.profiles p
  join public.businesses b on b.slug = 'client-demo'
 where p.email = 'test-auth@vwa.local'
   and not exists (
         select 1 from public.memberships m
          where m.profile_id = p.id and m.agency_id = b.agency_id and m.business_id is null
       );

-- Contrôle.
select p.email, m.role, m.is_active, a.name as agence
  from public.memberships m
  join public.profiles p on p.id = m.profile_id
  join public.agencies a on a.id = m.agency_id
 where a.id = (select agency_id from public.businesses where slug = 'client-demo');
