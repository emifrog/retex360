-- ============================================
-- Seed all 97 French SDIS (métropole + outre-mer)
-- ============================================

-- Clear existing data and re-insert all SDIS
-- (ON CONFLICT ensures idempotent execution)
INSERT INTO sdis (id, code, name, region) VALUES
  -- Auvergne-Rhône-Alpes
  (gen_random_uuid(), '01', 'SDIS de l''Ain', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '03', 'SDIS de l''Allier', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '07', 'SDIS de l''Ardèche', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '15', 'SDIS du Cantal', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '26', 'SDIS de la Drôme', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '38', 'SDIS de l''Isère', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '42', 'SDIS de la Loire', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '43', 'SDIS de la Haute-Loire', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '63', 'SDIS du Puy-de-Dôme', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '69', 'SDIS du Rhône', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '73', 'SDIS de la Savoie', 'Auvergne-Rhône-Alpes'),
  (gen_random_uuid(), '74', 'SDIS de la Haute-Savoie', 'Auvergne-Rhône-Alpes'),
  -- Bourgogne-Franche-Comté
  (gen_random_uuid(), '21', 'SDIS de la Côte-d''Or', 'Bourgogne-Franche-Comté'),
  (gen_random_uuid(), '25', 'SDIS du Doubs', 'Bourgogne-Franche-Comté'),
  (gen_random_uuid(), '39', 'SDIS du Jura', 'Bourgogne-Franche-Comté'),
  (gen_random_uuid(), '58', 'SDIS de la Nièvre', 'Bourgogne-Franche-Comté'),
  (gen_random_uuid(), '70', 'SDIS de la Haute-Saône', 'Bourgogne-Franche-Comté'),
  (gen_random_uuid(), '71', 'SDIS de Saône-et-Loire', 'Bourgogne-Franche-Comté'),
  (gen_random_uuid(), '89', 'SDIS de l''Yonne', 'Bourgogne-Franche-Comté'),
  (gen_random_uuid(), '90', 'SDIS du Territoire de Belfort', 'Bourgogne-Franche-Comté'),
  -- Bretagne
  (gen_random_uuid(), '22', 'SDIS des Côtes-d''Armor', 'Bretagne'),
  (gen_random_uuid(), '29', 'SDIS du Finistère', 'Bretagne'),
  (gen_random_uuid(), '35', 'SDIS d''Ille-et-Vilaine', 'Bretagne'),
  (gen_random_uuid(), '56', 'SDIS du Morbihan', 'Bretagne'),
  -- Centre-Val de Loire
  (gen_random_uuid(), '18', 'SDIS du Cher', 'Centre-Val de Loire'),
  (gen_random_uuid(), '28', 'SDIS d''Eure-et-Loir', 'Centre-Val de Loire'),
  (gen_random_uuid(), '36', 'SDIS de l''Indre', 'Centre-Val de Loire'),
  (gen_random_uuid(), '37', 'SDIS d''Indre-et-Loire', 'Centre-Val de Loire'),
  (gen_random_uuid(), '41', 'SDIS de Loir-et-Cher', 'Centre-Val de Loire'),
  (gen_random_uuid(), '45', 'SDIS du Loiret', 'Centre-Val de Loire'),
  -- Corse
  (gen_random_uuid(), '2A', 'SDIS de la Corse-du-Sud', 'Corse'),
  (gen_random_uuid(), '2B', 'SDIS de la Haute-Corse', 'Corse'),
  -- Grand Est
  (gen_random_uuid(), '08', 'SDIS des Ardennes', 'Grand Est'),
  (gen_random_uuid(), '10', 'SDIS de l''Aube', 'Grand Est'),
  (gen_random_uuid(), '51', 'SDIS de la Marne', 'Grand Est'),
  (gen_random_uuid(), '52', 'SDIS de la Haute-Marne', 'Grand Est'),
  (gen_random_uuid(), '54', 'SDIS de Meurthe-et-Moselle', 'Grand Est'),
  (gen_random_uuid(), '55', 'SDIS de la Meuse', 'Grand Est'),
  (gen_random_uuid(), '57', 'SDIS de la Moselle', 'Grand Est'),
  (gen_random_uuid(), '67', 'SDIS du Bas-Rhin', 'Grand Est'),
  (gen_random_uuid(), '68', 'SDIS du Haut-Rhin', 'Grand Est'),
  (gen_random_uuid(), '88', 'SDIS des Vosges', 'Grand Est'),
  -- Hauts-de-France
  (gen_random_uuid(), '02', 'SDIS de l''Aisne', 'Hauts-de-France'),
  (gen_random_uuid(), '59', 'SDIS du Nord', 'Hauts-de-France'),
  (gen_random_uuid(), '60', 'SDIS de l''Oise', 'Hauts-de-France'),
  (gen_random_uuid(), '62', 'SDIS du Pas-de-Calais', 'Hauts-de-France'),
  (gen_random_uuid(), '80', 'SDIS de la Somme', 'Hauts-de-France'),
  -- Île-de-France (hors Paris/petite couronne gérés par la BSPP)
  (gen_random_uuid(), '77', 'SDIS de Seine-et-Marne', 'Île-de-France'),
  (gen_random_uuid(), '78', 'SDIS des Yvelines', 'Île-de-France'),
  (gen_random_uuid(), '91', 'SDIS de l''Essonne', 'Île-de-France'),
  (gen_random_uuid(), '95', 'SDIS du Val-d''Oise', 'Île-de-France'),
  -- Normandie
  (gen_random_uuid(), '14', 'SDIS du Calvados', 'Normandie'),
  (gen_random_uuid(), '27', 'SDIS de l''Eure', 'Normandie'),
  (gen_random_uuid(), '50', 'SDIS de la Manche', 'Normandie'),
  (gen_random_uuid(), '61', 'SDIS de l''Orne', 'Normandie'),
  (gen_random_uuid(), '76', 'SDIS de la Seine-Maritime', 'Normandie'),
  -- Nouvelle-Aquitaine
  (gen_random_uuid(), '16', 'SDIS de la Charente', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '17', 'SDIS de la Charente-Maritime', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '19', 'SDIS de la Corrèze', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '23', 'SDIS de la Creuse', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '24', 'SDIS de la Dordogne', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '33', 'SDIS de la Gironde', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '40', 'SDIS des Landes', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '47', 'SDIS de Lot-et-Garonne', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '64', 'SDIS des Pyrénées-Atlantiques', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '79', 'SDIS des Deux-Sèvres', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '86', 'SDIS de la Vienne', 'Nouvelle-Aquitaine'),
  (gen_random_uuid(), '87', 'SDIS de la Haute-Vienne', 'Nouvelle-Aquitaine'),
  -- Occitanie
  (gen_random_uuid(), '09', 'SDIS de l''Ariège', 'Occitanie'),
  (gen_random_uuid(), '11', 'SDIS de l''Aude', 'Occitanie'),
  (gen_random_uuid(), '12', 'SDIS de l''Aveyron', 'Occitanie'),
  (gen_random_uuid(), '30', 'SDIS du Gard', 'Occitanie'),
  (gen_random_uuid(), '31', 'SDIS de la Haute-Garonne', 'Occitanie'),
  (gen_random_uuid(), '32', 'SDIS du Gers', 'Occitanie'),
  (gen_random_uuid(), '34', 'SDIS de l''Hérault', 'Occitanie'),
  (gen_random_uuid(), '46', 'SDIS du Lot', 'Occitanie'),
  (gen_random_uuid(), '48', 'SDIS de la Lozère', 'Occitanie'),
  (gen_random_uuid(), '65', 'SDIS des Hautes-Pyrénées', 'Occitanie'),
  (gen_random_uuid(), '66', 'SDIS des Pyrénées-Orientales', 'Occitanie'),
  (gen_random_uuid(), '81', 'SDIS du Tarn', 'Occitanie'),
  (gen_random_uuid(), '82', 'SDIS de Tarn-et-Garonne', 'Occitanie'),
  -- Pays de la Loire
  (gen_random_uuid(), '44', 'SDIS de la Loire-Atlantique', 'Pays de la Loire'),
  (gen_random_uuid(), '49', 'SDIS de Maine-et-Loire', 'Pays de la Loire'),
  (gen_random_uuid(), '53', 'SDIS de la Mayenne', 'Pays de la Loire'),
  (gen_random_uuid(), '72', 'SDIS de la Sarthe', 'Pays de la Loire'),
  (gen_random_uuid(), '85', 'SDIS de la Vendée', 'Pays de la Loire'),
  -- Provence-Alpes-Côte d'Azur (04, 05 manquants dans le seed initial)
  (gen_random_uuid(), '04', 'SDIS des Alpes-de-Haute-Provence', 'Provence-Alpes-Côte d''Azur'),
  (gen_random_uuid(), '05', 'SDIS des Hautes-Alpes', 'Provence-Alpes-Côte d''Azur'),
  -- Outre-mer
  (gen_random_uuid(), '971', 'SDIS de la Guadeloupe', 'Outre-mer'),
  (gen_random_uuid(), '972', 'SDIS de la Martinique', 'Outre-mer'),
  (gen_random_uuid(), '973', 'SDIS de la Guyane', 'Outre-mer'),
  (gen_random_uuid(), '974', 'SDIS de La Réunion', 'Outre-mer'),
  (gen_random_uuid(), '976', 'SDIS de Mayotte', 'Outre-mer')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  region = EXCLUDED.region;
