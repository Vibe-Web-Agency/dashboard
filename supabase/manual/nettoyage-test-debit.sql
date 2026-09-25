-- ═════════════════════════════════════════════════════════════════════════
--  À LANCER : supprime 3 réservations de test créées par erreur en PROD.
--
--  En testant la limitation de débit, j'ai envoyé 6 requêtes sur l'API de
--  réservation du site FiFi. Le site pointe sur la base de PRODUCTION : les
--  3 premières ont donc été réellement enregistrées avant que la limite ne
--  bloque les suivantes. Elles portent le nom « Test Débit ».
--
--  Vérifie d'abord ce que ça va supprimer :
--    select id, customer_name, customer_mail, date, guests
--      from reservations
--     where business_id = '05717a67-b353-4775-af7a-2afafcef570b'
--       and customer_name = 'Test Débit';
--  Tu dois voir 3 lignes, toutes au 2 octobre 2026 à 20h, et rien d'autre.
-- ═════════════════════════════════════════════════════════════════════════

delete from reservations
 where business_id = '05717a67-b353-4775-af7a-2afafcef570b'
   and customer_name = 'Test Débit'
   and customer_mail = 't@exemple.fr';

-- Doit renvoyer DELETE 3.
