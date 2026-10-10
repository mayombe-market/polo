-- ─────────────────────────────────────────────────────────────────────────────
-- Correctif : vendeurs bloqués sur "Vérification en cours" sans dossier soumis
-- Remet à 'unverified' tous les vendeurs dont le statut est 'pending'
-- mais qui n'ont aucune demande réelle dans vendor_verifications
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Voir combien de vendeurs sont concernés (diagnostic)
SELECT COUNT(*) AS vendeurs_bloques
FROM profiles
WHERE role = 'vendor'
  AND verification_status = 'pending'
  AND NOT EXISTS (
      SELECT 1 FROM vendor_verifications
      WHERE vendor_id = profiles.id
        AND status = 'pending'
  );

-- 2. Corriger : remettre à 'unverified' les vendeurs sans dossier réel
UPDATE profiles
SET verification_status = 'unverified', updated_at = NOW()
WHERE role = 'vendor'
  AND verification_status = 'pending'
  AND NOT EXISTS (
      SELECT 1 FROM vendor_verifications
      WHERE vendor_id = profiles.id
        AND status = 'pending'
  );
