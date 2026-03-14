-- Ajouter les colonnes manquantes à la table ads
-- À exécuter dans le SQL Editor de Supabase

ALTER TABLE ads ADD COLUMN IF NOT EXISTS link_url text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Créer le bucket storage pour les images de pubs (si pas déjà existant)
INSERT INTO storage.buckets (id, name, public) VALUES ('ads', 'ads', true) ON CONFLICT (id) DO NOTHING;

-- Policy de lecture publique sur le bucket ads
CREATE POLICY "Public read ads images" ON storage.objects FOR SELECT USING (bucket_id = 'ads');

-- Policy d'écriture pour les admins authentifiés
CREATE POLICY "Admin upload ads images" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'ads' AND auth.role() = 'authenticated'
);

CREATE POLICY "Admin delete ads images" ON storage.objects FOR DELETE USING (
    bucket_id = 'ads' AND auth.role() = 'authenticated'
);

-- Policy CRUD pour les admins sur la table ads
CREATE POLICY "Admin manage ads" ON ads FOR ALL USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
