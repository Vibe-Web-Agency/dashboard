-- ═════════════════════════════════════════════════════════════════════════
--  FiFi — Bouillon & Brasserie : coordonnées réelles, base de PRODUCTION
--  (ancien schéma — à rejouer différemment après la migration v2).
--
--  À coller dans l'éditeur SQL de Supabase, projet « VWA Dashboard ».
--  C'est un UPDATE : la ligne existe déjà (05717a67…), créée quand le site a
--  été relié. En créer une seconde casserait le NEXT_PUBLIC_BUSINESS_ID du
--  site et couperait les réservations.
--
--  Vérifie d'abord ce qu'elle contient :
--    select * from businesses where id = '05717a67-b353-4775-af7a-2afafcef570b';
-- ═════════════════════════════════════════════════════════════════════════

update businesses set
  name          = 'FiFi — Bouillon & Brasserie',
  address       = '56B rue de Clichy, 75009 Paris',
  email         = 'fifirestaurantparis@gmail.com',
  phone         = '+33 9 51 28 34 18',
  contact_email = 'fifirestaurantparis@gmail.com',
  contact_phone = '+33 9 51 28 34 18',
  maps_url      = 'https://www.google.com/maps/search/?api=1&query=56B+rue+de+Clichy%2C+75009+Paris',

  -- Service continu 7j/7 à partir de 11h. Fermeture à minuit du dimanche au
  -- jeudi, à 2h le vendredi et le samedi — d'où un `to` antérieur au `from`
  -- ces deux jours-là : il désigne le lendemain.
  hours = '{
    "lundi":    { "open": true, "from": "11:00", "to": "00:00" },
    "mardi":    { "open": true, "from": "11:00", "to": "00:00" },
    "mercredi": { "open": true, "from": "11:00", "to": "00:00" },
    "jeudi":    { "open": true, "from": "11:00", "to": "00:00" },
    "vendredi": { "open": true, "from": "11:00", "to": "02:00" },
    "samedi":   { "open": true, "from": "11:00", "to": "02:00" },
    "dimanche": { "open": true, "from": "11:00", "to": "00:00" }
  }'::jsonb
where id = '05717a67-b353-4775-af7a-2afafcef570b';

-- Doit renvoyer UPDATE 1. Si c'est UPDATE 0, l'identifiant ne correspond pas
-- à cette base : ne crée pas la ligne à la main, dis-le-moi.

-- Le type doit être « restaurant » : c'est lui qui décide du vocabulaire des
-- rappels (« réservation » plutôt que « rendez-vous »).
update businesses b set business_type_id = t.id
from business_types t
where b.id = '05717a67-b353-4775-af7a-2afafcef570b'
  and t.slug = 'restaurant'
  and b.business_type_id is distinct from t.id;

select name, address, phone, contact_email, hours
from businesses where id = '05717a67-b353-4775-af7a-2afafcef570b';
