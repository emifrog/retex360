-- ============================================
-- RETEX360 - Données de démonstration
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- IMPORTANT: Remplacez cette valeur par l'ID d'un utilisateur existant
-- Vous pouvez le trouver dans Authentication > Users
-- Ou créez d'abord un compte de démo via l'interface

-- Variable pour l'auteur (à remplacer)
DO $$
DECLARE
  demo_author_id UUID;
  demo_validator_id UUID;
  sdis_06 UUID := 'a0000000-0000-4000-a000-000000000001';
  sdis_13 UUID := 'a0000000-0000-4000-a000-000000000002';
  sdis_83 UUID := 'a0000000-0000-4000-a000-000000000003';
  sdis_84 UUID := 'a0000000-0000-4000-a000-000000000004';
BEGIN
  -- Récupérer le premier utilisateur existant comme auteur de démo
  SELECT id INTO demo_author_id FROM profiles LIMIT 1;
  
  -- Si aucun utilisateur, on ne peut pas continuer
  IF demo_author_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé. Créez d''abord un compte via l''interface.';
  END IF;
  
  -- Récupérer un validateur si disponible
  SELECT id INTO demo_validator_id FROM profiles WHERE role IN ('validator', 'admin', 'super_admin') LIMIT 1;
  IF demo_validator_id IS NULL THEN
    demo_validator_id := demo_author_id;
  END IF;

  -- ============================================
  -- RETEX 1: Feu d'entrepôt chimique
  -- ============================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    description, context, means_deployed, difficulties, lessons_learned, tags,
    views_count, validated_by, validated_at
  ) VALUES (
    sdis_06,
    demo_author_id,
    'Feu d''entrepôt chimique - Zone industrielle Carros',
    '2024-11-15',
    'Incendie industriel',
    'critique',
    'validated',
    'inter_sdis',
    'Incendie majeur dans un entrepôt de stockage de produits chimiques. Propagation rapide nécessitant l''évacuation du périmètre et la mise en place d''un PRM.',
    'Alerte déclenchée à 14h32 par le gardien du site. À l''arrivée des secours, le feu avait déjà atteint 2 cellules de stockage sur 5. Présence de fûts de solvants et produits corrosifs. Vent de secteur Est à 25 km/h orientant les fumées vers zone habitée.',
    '- 1 FPTL + 1 FPT en primo-intervention
- Renfort : 2 FPT, 1 FMOGP, 1 CCGC
- Cellule NRBC départementale
- 1 VSAV + 1 VL médecin
- PC de site + PC de colonne
- Moyens aériens : 1 hélicoptère reconnaissance',
    '- Identification tardive des produits stockés (FDS incomplètes)
- Liaison radio saturée en début d''intervention
- Accès pompiers obstrué par véhicules stationnés
- Alimentation en eau insuffisante (PI à 400m)',
    '- Nécessité de conventions avec industriels pour accès aux FDS en temps réel
- Révision du plan ETARE avec positionnement de PI supplémentaires
- Formation renforcée des primo-intervenants aux risques chimiques
- Mise en place d''un canal radio dédié pour les interventions multi-engins',
    ARRAY['NRBC', 'POI', 'multi-sites', 'évacuation', 'FMOGP'],
    234,
    demo_validator_id,
    NOW() - INTERVAL '5 days'
  );

  -- ============================================
  -- RETEX 2: Effondrement parking souterrain
  -- ============================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    description, context, means_deployed, difficulties, lessons_learned, tags,
    views_count, validated_by, validated_at
  ) VALUES (
    sdis_06,
    demo_author_id,
    'Effondrement parking souterrain - Nice Centre',
    '2024-10-28',
    'Sauvetage déblaiement',
    'majeur',
    'validated',
    'inter_sdis',
    'Effondrement partiel du niveau -2 d''un parking souterrain suite à une fuite d''eau ayant fragilisé la structure. 3 véhicules ensevelis, 2 victimes incarcérées.',
    'Effondrement survenu à 18h45 en heure de pointe. Parking de 450 places sur 3 niveaux. Fuite d''eau signalée depuis 48h mais non traitée. Dalle béton de 30cm effondrée sur environ 200m². Risque de sur-effondrement identifié.',
    '- GRIMP départemental
- Équipe cynophile (2 chiens)
- Cellule sauvetage-déblaiement
- 2 VSAV + SMUR
- Architecte conseil
- Équipe gaz/élec pour sécurisation réseaux',
    '- Risque de sur-effondrement permanent
- Éclairage insuffisant en sous-sol
- Communication difficile avec victimes (réseau GSM absent)
- Évacuation complexe des niveaux supérieurs',
    '- Protocole de reconnaissance préalable par drone en milieu confiné
- Équipement systématique en éclairage autonome puissant
- Mise en place de répéteurs radio pour parkings souterrains
- Convention avec ordre des architectes pour expertise rapide',
    ARRAY['USAR', 'cynophile', 'extraction', 'GRIMP', 'risque effondrement'],
    189,
    demo_validator_id,
    NOW() - INTERVAL '12 days'
  );

  -- ============================================
  -- RETEX 3: Feux de forêt simultanés
  -- ============================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    description, context, means_deployed, difficulties, lessons_learned, tags,
    views_count, validated_by, validated_at
  ) VALUES (
    sdis_83,
    demo_author_id,
    'Feux de forêt simultanés - Massif de l''Estérel',
    '2024-08-12',
    'FDF',
    'critique',
    'validated',
    'public',
    'Départs de feux multiples (3) sur le massif de l''Estérel en conditions météo extrêmes. Mobilisation de colonnes de renfort et moyens aériens nationaux.',
    'Canicule avec températures >40°C, vent variable 40-60 km/h, hygrométrie <15%. Premier départ à 13h15, deux autres à 13h45 et 14h02 (suspicion origine criminelle). Menace sur campings et habitations. 1200 hectares parcourus.',
    '- 3 GIFF constitués
- 4 colonnes de renfort (SDIS 06, 13, 84, 30)
- 2 Canadair + 2 Dash + 1 Beech
- 1 hélicoptère bombardier d''eau
- PC de site + COD activé
- 150 sapeurs-pompiers engagés au plus fort',
    '- Coordination inter-SDIS complexe (fréquences différentes)
- Rotation des personnels insuffisante (intervention >12h)
- Points d''eau naturels asséchés
- Accès DFCI non entretenus sur certains secteurs',
    '- Exercice annuel inter-SDIS obligatoire sur coordination FDF
- Pré-positionnement de citernes souples en période rouge
- Cartographie partagée des points d''eau avec mise à jour temps réel
- Révision des conventions d''entraide avec moyens radio compatibles',
    ARRAY['colonnes', 'coordination', 'aérien', 'FDF', 'canicule', 'GIFF'],
    456,
    demo_validator_id,
    NOW() - INTERVAL '20 days'
  );

  -- ============================================
  -- RETEX 4: Accident TMD A8
  -- ============================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    description, context, means_deployed, difficulties, lessons_learned, tags,
    views_count, validated_by, validated_at
  ) VALUES (
    sdis_06,
    demo_author_id,
    'Accident TMD A8 - Produit inconnu',
    '2024-09-05',
    'NRBC',
    'majeur',
    'validated',
    'inter_sdis',
    'Accident PL transportant des matières dangereuses sur A8. Renversement de la citerne avec fuite de produit non identifié initialement. Fermeture de l''autoroute dans les deux sens.',
    'Accident à 06h30 sur A8 sens Nice-Aix, PK 47. Camion-citerne renversé après évitement d''un véhicule. Conducteur éjecté, décédé. Fuite importante par dôme de citerne. Plaques TMD partiellement lisibles. Trafic dense.',
    '- CMIC départementale
- VR NRBC
- 2 VSAV + SMUR
- Gendarmerie + CRS autoroute
- VINCI Autoroutes
- DREAL pour identification produit',
    '- Identification produit longue (2h) - documents de bord détruits
- Périmètre de sécurité difficile à tenir (automobilistes impatients)
- Vent changeant compliquant le zonage
- Absence de bassin de rétention sur ce tronçon',
    '- Accès base de données TMD en temps réel via tablette
- Formation des primo-intervenants à la lecture plaques TMD dégradées
- Coordination renforcée avec gestionnaires autoroutiers
- Équipement de bâchage d''urgence sur FPTL',
    ARRAY['TMD', 'périmètre', 'décontamination', 'autoroute', 'CMIC'],
    312,
    demo_validator_id,
    NOW() - INTERVAL '30 days'
  );

  -- ============================================
  -- RETEX 5: Noyade collective (en attente)
  -- ============================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    description, context, means_deployed, difficulties, lessons_learned, tags,
    views_count
  ) VALUES (
    sdis_06,
    demo_author_id,
    'Noyade collective plage Antibes',
    '2024-07-22',
    'SAV',
    'significatif',
    'pending',
    'sdis',
    'Intervention pour noyade multiple suite à baïne non signalée. 4 victimes dont 2 en arrêt cardio-respiratoire à l''arrivée des secours.',
    'Plage surveillée, 15h30, forte affluence estivale. Formation soudaine d''un courant de baïne. 4 baigneurs emportés dont 2 enfants. Alerte donnée par MNS. Conditions météo : mer agitée, vent de terre.',
    '- 2 VSAV
- 1 VL chef de groupe
- SMUR
- Hélicoptère Dragon 06
- Vedette SNSM',
    '- Afflux de badauds gênant l''intervention
- Coordination avec MNS perfectible
- Délai d''arrivée hélicoptère (20 min)',
    '- Protocole de coordination SP/MNS à formaliser
- Pré-positionnement estival de moyens sur littoral
- Sensibilisation du public aux risques de baïne',
    ARRAY['SAV', 'afflux', 'coordination secours', 'plage', 'noyade'],
    45
  );

  -- ============================================
  -- RETEX 6: Incendie ERP
  -- ============================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    description, context, means_deployed, difficulties, lessons_learned, tags,
    views_count, validated_by, validated_at
  ) VALUES (
    sdis_13,
    demo_author_id,
    'Incendie centre commercial - Marseille La Valentine',
    '2024-06-18',
    'Incendie ERP',
    'majeur',
    'validated',
    'public',
    'Feu de réserve dans un centre commercial de type M. Évacuation de 2000 personnes. Propagation limitée grâce au compartimentage.',
    'Départ de feu à 11h15 dans la réserve d''une enseigne de sport. Détection automatique fonctionnelle. Évacuation déclenchée par SSIAP. Centre commercial sur 2 niveaux, 45 boutiques.',
    '- 2 FPT + 1 EPA
- 1 VSAV précaution
- PC de site
- Équipe SSIAP du site
- Police nationale pour périmètre',
    '- Localisation initiale difficile (fumée dans gaines techniques)
- Accès pompiers encombré par véhicules livraison
- Coupure électrique générale retardée',
    '- Visite de prévention renforcée sur accessibilité
- Exercice annuel avec SSIAP obligatoire
- Mise à jour plans d''intervention',
    ARRAY['ERP', 'évacuation', 'SSIAP', 'compartimentage', 'centre commercial'],
    178,
    demo_validator_id,
    NOW() - INTERVAL '45 days'
  );

  -- ============================================
  -- RETEX 7: Inondation
  -- ============================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    description, context, means_deployed, difficulties, lessons_learned, tags,
    views_count, validated_by, validated_at
  ) VALUES (
    sdis_84,
    demo_author_id,
    'Crue éclair Ouvèze - Secteur Vaison',
    '2024-10-15',
    'Inondation',
    'critique',
    'validated',
    'inter_sdis',
    'Épisode cévenol intense provoquant une crue rapide de l''Ouvèze. 150 interventions en 6 heures. 12 hélitreuillages. Aucune victime.',
    'Vigilance orange pluie-inondation. Cumuls 180mm en 3h. Montée des eaux de 4m en 45 minutes. Camping évacué préventivement. Plusieurs véhicules emportés.',
    '- Plan ORSEC inondation activé
- 3 embarcations
- Dragon 84
- 80 sapeurs-pompiers
- Colonnes de renfort SDIS 13 et 30
- Cellule soutien',
    '- Réseau téléphonique saturé
- Routes coupées isolant certains secteurs
- Fatigue des personnels (interventions continues)',
    '- Pré-alerte systématique des campings en vigilance orange
- Renforcement du réseau radio en zone blanche
- Rotation des personnels planifiée dès H+4',
    ARRAY['inondation', 'crue', 'hélitreuillage', 'ORSEC', 'épisode cévenol'],
    267,
    demo_validator_id,
    NOW() - INTERVAL '15 days'
  );

  -- ============================================
  -- RETEX 8: Accident de la route grave
  -- ============================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    description, context, means_deployed, difficulties, lessons_learned, tags,
    views_count
  ) VALUES (
    sdis_06,
    demo_author_id,
    'Collision frontale RD 6202 - Gorges du Var',
    '2024-11-28',
    'AVP',
    'majeur',
    'draft',
    'sdis',
    'Collision frontale entre un VL et un car de tourisme. 2 décès, 8 blessés dont 3 urgences absolues.',
    'Accident à 16h45 sur RD 6202 dans les gorges du Var. VL en dépassement hasardeux. Car de 35 passagers. Route étroite, pas de bande d''arrêt d''urgence.',
    '- 3 VSAV + 1 VL médecin + SMUR
- 1 VSR
- 2 FPT (désincarcération + protection)
- Hélicoptère Dragon 06
- Gendarmerie',
    '- Accès difficile pour les renforts
- Gestion de nombreuses victimes simultanées
- Évacuation héliportée complexe (relief)',
    'En cours de rédaction...',
    ARRAY['AVP', 'désincarcération', 'nombreuses victimes', 'héliportage'],
    12
  );

  RAISE NOTICE 'Données de démonstration insérées avec succès !';
  RAISE NOTICE 'Auteur utilisé : %', demo_author_id;
  
END $$;

-- ============================================
-- Vérification
-- ============================================
SELECT 
  title, 
  type, 
  severity, 
  status, 
  views_count,
  array_length(tags, 1) as nb_tags
FROM rex 
ORDER BY created_at DESC;
