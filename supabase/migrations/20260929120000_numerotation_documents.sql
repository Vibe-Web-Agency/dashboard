-- La numérotation des documents était impossible.
--
-- `document_sequences` a RLS activée et AUCUNE politique : personne ne peut
-- y écrire. `next_document_number` n'étant pas `security definer`, elle
-- tentait l'insertion au nom de l'appelant, qui était refusée. Aucun devis,
-- aucune commande, aucune facture ne pouvait donc recevoir de numéro — et la
-- contrainte `check (status in (…) or number is not null)` rendait tout le
-- domaine facturation inutilisable.
--
-- Trouvé en construisant l'écran Devis : le passage à « Envoyé » échouait
-- sans rien écrire.

create or replace function next_document_number(p_business uuid, p_kind text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_year   smallint := extract(year from now() at time zone
                         (select timezone from businesses where id = p_business));
  v_number int;
begin
  -- `security definer`, et le contrôle d'accès est donc ICI.
  --
  -- La fonction écrit dans `document_sequences`, une table sous RLS et sans
  -- aucune politique : personne ne peut y écrire. Sans `security definer`,
  -- l'insertion se faisait au nom de l'appelant et était refusée — donc
  -- aucun devis, aucune commande et aucune facture ne pouvait être numéroté,
  -- et tout le domaine facturation restait inutilisable.
  --
  -- La table reste fermée à tous : la séquence ne doit se toucher QUE par
  -- ici. Une écriture directe créerait un trou ou un doublon dans la
  -- numérotation, ce qui ne passe pas un contrôle comptable.
  if not exists (select 1 from businesses where id = p_business) then
    raise exception 'Commerce introuvable';
  end if;

  -- Le contrôle d'accès est ICI, puisque la fonction est `security definer`.
  --
  -- La clé de SERVICE en est dispensée : les crons et les routes d'API
  -- numérotent sans session, donc `auth.uid()` y est nul et
  -- `accessible_business_ids` ne rendrait rien. Sans cette exception, le
  -- serveur ne pourrait plus émettre une facture.
  -- Trois cas, et pas un de plus :
  --
  --   • la clé de SERVICE passe — les crons et les routes d'API numérotent
  --     sans session, donc `auth.uid()` y est nul et `accessible_business_ids`
  --     ne rendrait rien ;
  --   • un membre du commerce passe ;
  --   • tout le reste est refusé, y compris le rôle anonyme.
  --
  -- Ce dernier point compte : `execute` est accordé à PUBLIC par défaut sur
  -- les fonctions, donc sans ce refus un visiteur anonyme pouvait brûler des
  -- numéros de séquence. Une numérotation à trous ne passe pas un contrôle
  -- comptable.
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    if auth.uid() is null then
      raise exception 'Authentification requise';
    end if;
    if p_business not in (select accessible_business_ids('member')) then
      raise exception 'Accès refusé à ce commerce';
    end if;
  end if;

  if p_kind not in ('order', 'quote', 'invoice', 'credit_note') then
    raise exception 'Type de document inconnu : %', p_kind;
  end if;

  insert into document_sequences (business_id, kind, year, last_number)
  values (p_business, p_kind, v_year, 1)
  on conflict (business_id, kind, year)
    do update set last_number = document_sequences.last_number + 1
  returning last_number into v_number;

  return format('%s-%s-%s',
    case p_kind when 'order' then 'CMD' when 'quote' then 'DEV'
                when 'invoice' then 'FAC' when 'credit_note' then 'AV' end,
    v_year, lpad(v_number::text, 4, '0'));
end $$;

revoke execute on function next_document_number(uuid, text) from anon;
