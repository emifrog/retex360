-- ============================================================================
-- RETEX360 — Seed de démonstration COMPLET (présentation-ready)
-- ============================================================================
-- Remplace seed_demo_account.sql + seed_demo_data.sql pour le compte démo.
--
-- Objectif : un compte démo qui montre TOUTES les fonctionnalités phares dès la
-- connexion — RETEX complets (chiffres clés, timeline, prescriptions, focus
-- thématiques, témoignages, ressources, champs DGSCGC), workflow 3 niveaux
-- (Signalement / PEX / RETEX), commentaires + mentions, favoris, notifications.
--
-- PRÉREQUIS :
--   1. Créer l'utilisateur dans Supabase Dashboard > Authentication > Users :
--        Email : demo@retex360.fr   Mot de passe : Demo2025!   (Auto Confirm ✓)
--   2. Exécuter d'abord les migrations 001 → 013.
--   3. Exécuter CE script dans le SQL Editor (rôle service — bypass RLS).
--
-- Idempotent : ré-exécutable (purge les données démo précédentes au début).
-- ============================================================================

DO $$
DECLARE
  demo_id        UUID;
  validator_id   UUID;
  sdis_id_demo   UUID;
  r_retex1       UUID;
  r_retex2       UUID;
  r_retex3       UUID;
  r_pex          UUID;
  r_signalement  UUID;
  c_parent       UUID;
BEGIN
  -- ---- Résolution des identifiants ----------------------------------------
  SELECT id INTO demo_id FROM profiles WHERE email = 'demo@retex360.fr';
  IF demo_id IS NULL THEN
    RAISE EXCEPTION 'Compte démo introuvable. Créez d''abord demo@retex360.fr dans Authentication > Users.';
  END IF;

  -- SDIS de rattachement du compte démo (06 = Alpes-Maritimes, sinon 1er SDIS).
  SELECT id INTO sdis_id_demo FROM sdis WHERE code = '06' LIMIT 1;
  IF sdis_id_demo IS NULL THEN
    SELECT id INTO sdis_id_demo FROM sdis ORDER BY code LIMIT 1;
  END IF;

  -- Un validateur pour renseigner validated_by (sinon le compte démo lui-même).
  SELECT id INTO validator_id FROM profiles
    WHERE role IN ('validator', 'admin', 'super_admin') LIMIT 1;
  IF validator_id IS NULL THEN
    validator_id := demo_id;
  END IF;

  -- ---- Profil du compte démo ----------------------------------------------
  UPDATE profiles
  SET full_name = 'Compte Démo',
      grade     = 'Capitaine',
      role      = 'user',
      sdis_id   = sdis_id_demo
  WHERE id = demo_id;

  -- ---- Purge des données démo précédentes (idempotence) -------------------
  DELETE FROM favorites WHERE user_id = demo_id;
  DELETE FROM notifications WHERE user_id = demo_id;
  DELETE FROM comments WHERE author_id = demo_id;
  DELETE FROM rex WHERE author_id = demo_id; -- cascade : comments + favorites + attachments

  -- =========================================================================
  -- RETEX 1 — Incendie industriel (COMPLET : toutes les sections DGSCGC)
  -- =========================================================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    type_production, description, context, means_deployed, difficulties, lessons_learned,
    message_ambiance, sitac, elements_favorables, elements_defavorables,
    documentation_operationnelle, tags, views_count, validated_by, validated_at,
    key_figures, chronologie, prescriptions, focus_thematiques, temoignages,
    ressources_complementaires
  ) VALUES (
    sdis_id_demo, demo_id,
    $t$Feu d'entrepôt chimique — Zone industrielle de Carros$t$,
    '2024-11-15', 'Incendie industriel', 'critique', 'validated', 'public', 'retex',
    $t$Incendie majeur dans un entrepôt de stockage de produits chimiques. Propagation rapide ayant nécessité l'évacuation du périmètre et la mise en place d'un poste de commandement de site.$t$,
    $t$Alerte à 14h32 par le gardien du site. À l'arrivée des secours, 2 cellules de stockage sur 5 étaient embrasées. Présence de fûts de solvants et de produits corrosifs. Vent d'Est à 25 km/h orientant les fumées vers une zone habitée.$t$,
    $t$1 FPT + 1 FPTL en primo-intervention, renfort de 2 FPT, 1 FMOGP et 1 CCGC, cellule NRBC départementale, 1 VSAV + 1 VL médecin, PC de site et PC de colonne, 1 hélicoptère de reconnaissance.$t$,
    $t$Identification tardive des produits (FDS incomplètes), liaison radio saturée en début d'intervention, accès obstrué par des véhicules en stationnement, alimentation en eau insuffisante (PI à 400 m).$t$,
    $t$Conventionner l'accès aux FDS en temps réel avec les industriels, réviser le plan ETARE, renforcer la formation des primo-intervenants aux risques chimiques, dédier un canal radio aux interventions multi-engins.$t$,
    $t$« Fumées noires visibles à plusieurs kilomètres, ambiance tendue à l'arrivée, priorité donnée à la mise en sécurité des riverains. »$t$,
    $t$Dispositif en U autour des cellules embrasées, FMOGP en protection de la cellule attenante non atteinte, point de transparence sous le vent.$t$,
    $t$Détection automatique fonctionnelle, présence d'un POI à jour, bonne coordination avec l'exploitant pour la coupure des fluides.$t$,
    $t$FDS non disponibles immédiatement, défaut de ressource en eau à proximité, encombrement des voies d'accès.$t$,
    $t$Application de la GDO « Intervention à caractère chimique » et de la GTO « Lutte contre les feux d'entrepôts ».$t$,
    ARRAY['NRBC','POI','évacuation','FMOGP','ETARE'],
    234, validator_id, NOW() - INTERVAL '5 days',
    $json${
      "nb_sp_engages": 84,
      "duree_intervention": "7h20",
      "nb_vehicules": 22,
      "bilan_humain": {"victimes_decedees": 0, "victimes_urgence_absolue": 0, "victimes_urgence_relative": 2, "impliques": 12},
      "sdis_impliques": ["06"],
      "surface_sinistree": "1 800 m²",
      "nb_personnes_evacuees": 120,
      "nb_lances": 6,
      "debit_eau": "4 000 L/min"
    }$json$::jsonb,
    $json$[
      {"id":"1","heure":"14:32","titre":"Alerte","description":"Appel du gardien du site","type":"alerte"},
      {"id":"2","heure":"14:41","titre":"Arrivée des premiers engins","description":"2 cellules embrasées sur 5","type":"arrivee"},
      {"id":"3","heure":"14:55","titre":"Demande de renforts","description":"FMOGP + cellule NRBC","type":"message_radio"},
      {"id":"4","heure":"15:30","titre":"Évacuation du périmètre","description":"120 personnes mises en sécurité","type":"action"},
      {"id":"5","heure":"18:10","titre":"Feu circonscrit","description":"Propagation stoppée à la cellule 3","type":"action"},
      {"id":"6","heure":"21:52","titre":"Fin d'intervention","description":"Surveillance maintenue jusqu'au lendemain","type":"fin"}
    ]$json$::jsonb,
    $json$[
      {"id":"1","categorie":"operations","description":"Mettre en place un canal radio dédié aux interventions multi-engins","responsable":"Groupement opérations","echeance":"2025-03-31","statut":"en_cours"},
      {"id":"2","categorie":"prevention","description":"Réviser le plan ETARE avec positionnement de PI supplémentaires","responsable":"Groupement prévision","echeance":"2025-06-30","statut":"a_faire"},
      {"id":"3","categorie":"formation","description":"Renforcer la formation risque chimique des primo-intervenants","responsable":"École départementale","echeance":"2025-02-28","statut":"fait"},
      {"id":"4","categorie":"technique","description":"Doter les FPTL d'un kit d'identification produits","statut":"a_faire"}
    ]$json$::jsonb,
    $json$[
      {"id":"1","theme":"Alimentation en eau","problematique":"Ressource en eau insuffisante à proximité immédiate (PI à 400 m).","actions_menees":"Mise en place d'une noria de CCGC et établissement d'une grande longueur.","axes_amelioration":"Cartographier et compléter le maillage des PI de la zone industrielle.","points_forts":"Réactivité de la noria.","points_amelioration":"Délai d'établissement initial."},
      {"id":"2","theme":"Transmissions","problematique":"Saturation radio en début d'intervention.","actions_menees":"Bascule sur un canal de conduite dédié.","axes_amelioration":"Procédure d'attribution automatique d'un canal multi-engins."}
    ]$json$::jsonb,
    $json$[
      {"id":"1","auteur_fonction":"Chef de colonne","citation":"La bascule sur un canal dédié a immédiatement fluidifié la conduite des opérations.","contexte":"Retour à chaud J+1"},
      {"id":"2","auteur_fonction":"Officier NRBC","citation":"Sans FDS exploitables, la levée de doute a coûté un temps précieux.","contexte":"Débriefing"}
    ]$json$::jsonb,
    $json$[
      {"id":"1","titre":"GDO Intervention à caractère chimique","type":"gdo","url_ou_reference":"GDO-NRBC-2021"},
      {"id":"2","titre":"Fiche ETARE entrepôt Carros","type":"etare","url_ou_reference":"ETARE-06-0142"}
    ]$json$::jsonb
  ) RETURNING id INTO r_retex1;

  -- =========================================================================
  -- RETEX 2 — Sauvetage déblaiement (chiffres clés + timeline + prescriptions)
  -- =========================================================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    type_production, description, context, means_deployed, difficulties, lessons_learned,
    tags, views_count, validated_by, validated_at, key_figures, chronologie, prescriptions
  ) VALUES (
    sdis_id_demo, demo_id,
    $t$Effondrement de parking souterrain — Nice Centre$t$,
    '2024-10-28', 'Sauvetage déblaiement', 'majeur', 'validated', 'inter_sdis', 'retex',
    $t$Effondrement partiel du niveau -2 d'un parking souterrain à la suite d'une fuite d'eau ayant fragilisé la structure. 3 véhicules ensevelis, 2 victimes incarcérées.$t$,
    $t$Effondrement à 18h45 en heure de pointe. Parking de 450 places sur 3 niveaux. Fuite signalée depuis 48 h mais non traitée. Dalle de 30 cm effondrée sur environ 200 m². Risque de sur-effondrement identifié.$t$,
    $t$GRIMP départemental, équipe cynophile (2 chiens), cellule sauvetage-déblaiement, 2 VSAV + SMUR, architecte conseil, équipe gaz/électricité pour la sécurisation des réseaux.$t$,
    $t$Risque de sur-effondrement permanent, éclairage insuffisant en sous-sol, communication difficile avec les victimes (réseau GSM absent), évacuation complexe des niveaux supérieurs.$t$,
    $t$Reconnaissance préalable par drone en milieu confiné, éclairage autonome systématique, répéteurs radio pour parkings souterrains, convention d'expertise rapide avec l'ordre des architectes.$t$,
    ARRAY['USAR','cynophile','GRIMP','extraction'],
    189, validator_id, NOW() - INTERVAL '12 days',
    $json${
      "nb_sp_engages": 46,
      "duree_intervention": "9h05",
      "nb_vehicules": 14,
      "bilan_humain": {"victimes_decedees": 0, "victimes_urgence_absolue": 1, "victimes_urgence_relative": 1, "impliques": 0},
      "sdis_impliques": ["06"],
      "nb_personnes_evacuees": 60
    }$json$::jsonb,
    $json$[
      {"id":"1","heure":"18:45","titre":"Alerte effondrement","type":"alerte"},
      {"id":"2","heure":"18:58","titre":"Arrivée GRIMP + cynophile","type":"arrivee"},
      {"id":"3","heure":"20:15","titre":"Localisation des 2 victimes","type":"action"},
      {"id":"4","heure":"23:40","titre":"Dégagement de la 1re victime","type":"action"},
      {"id":"5","heure":"03:50","titre":"Fin d'intervention","type":"fin"}
    ]$json$::jsonb,
    $json$[
      {"id":"1","categorie":"operations","description":"Doter la cellule SD de répéteurs radio pour milieux souterrains","responsable":"Groupement opérations","statut":"en_cours"},
      {"id":"2","categorie":"technique","description":"Acquérir un drone d'inspection en milieu confiné","statut":"a_faire"}
    ]$json$::jsonb
  ) RETURNING id INTO r_retex2;

  -- =========================================================================
  -- RETEX 3 — NRBC / TMD (chiffres clés + timeline + prescriptions)
  -- =========================================================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    type_production, description, context, means_deployed, difficulties, lessons_learned,
    tags, views_count, validated_by, validated_at, key_figures, chronologie, prescriptions
  ) VALUES (
    sdis_id_demo, demo_id,
    $t$Accident TMD sur A8 — Produit initialement non identifié$t$,
    '2024-09-05', 'NRBC', 'majeur', 'validated', 'sdis', 'retex',
    $t$Accident d'un poids lourd transportant des matières dangereuses sur l'A8. Renversement de la citerne avec fuite d'un produit non identifié au départ. Fermeture de l'autoroute dans les deux sens.$t$,
    $t$Accident à 06h30, sens Nice-Aix, PK 47. Citerne renversée après évitement. Conducteur décédé. Fuite par le dôme. Plaques TMD partiellement lisibles. Trafic dense.$t$,
    $t$CMIC départementale, VR NRBC, 2 VSAV + SMUR, gendarmerie + CRS autoroute, société d'autoroute, DREAL pour l'identification du produit.$t$,
    $t$Identification du produit longue (2 h), périmètre de sécurité difficile à tenir, vent changeant compliquant le zonage, absence de bassin de rétention sur ce tronçon.$t$,
    $t$Accès à une base de données TMD en temps réel via tablette, formation à la lecture de plaques dégradées, coordination renforcée avec le gestionnaire autoroutier, kit de bâchage d'urgence.$t$,
    ARRAY['TMD','périmètre','CMIC','autoroute'],
    312, validator_id, NOW() - INTERVAL '22 days',
    $json${
      "nb_sp_engages": 38,
      "duree_intervention": "5h40",
      "nb_vehicules": 11,
      "bilan_humain": {"victimes_decedees": 1, "victimes_urgence_absolue": 0, "victimes_urgence_relative": 0, "impliques": 0},
      "sdis_impliques": ["06"],
      "surface_sinistree": "Zone d'exclusion 150 m"
    }$json$::jsonb,
    $json$[
      {"id":"1","heure":"06:30","titre":"Alerte accident TMD","type":"alerte"},
      {"id":"2","heure":"06:44","titre":"Arrivée + bouclage A8","type":"arrivee"},
      {"id":"3","heure":"08:30","titre":"Identification du produit","description":"Levée de doute par la DREAL","type":"action"},
      {"id":"4","heure":"12:10","titre":"Réouverture progressive","type":"fin"}
    ]$json$::jsonb,
    $json$[
      {"id":"1","categorie":"operations","description":"Déployer l'accès à la base TMD sur tablette en VR NRBC","responsable":"Groupement opérations","echeance":"2025-04-30","statut":"a_faire"},
      {"id":"2","categorie":"prevention","description":"Recenser les tronçons sans bassin de rétention avec le gestionnaire","statut":"en_cours"}
    ]$json$::jsonb
  ) RETURNING id INTO r_retex3;

  -- =========================================================================
  -- PEX — Feu de forêt (niveau intermédiaire, validé)
  -- =========================================================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    type_production, description, context, means_deployed, lessons_learned,
    tags, views_count, validated_by, validated_at, key_figures
  ) VALUES (
    sdis_id_demo, demo_id,
    $t$Coordination inter-SDIS sur feu de forêt — Massif de l'Estérel$t$,
    '2024-08-12', 'FDF', 'critique', 'validated', 'inter_sdis', 'pex',
    $t$Partage d'expérience sur la coordination de colonnes de renfort lors de départs de feux simultanés en conditions météo extrêmes.$t$,
    $t$Canicule (>40°C), vent 40-60 km/h, hygrométrie <15%. Trois départs en moins d'une heure. 1 200 hectares parcourus.$t$,
    $t$3 GIFF, 4 colonnes de renfort (06, 13, 84, 30), moyens aériens nationaux (Canadair, Dash), PC de site, COD activé.$t$,
    $t$Exercice annuel inter-SDIS sur la coordination FDF, pré-positionnement de citernes souples en période rouge, cartographie partagée des points d'eau, conventions d'entraide avec radios compatibles.$t$,
    ARRAY['FDF','colonnes','coordination','aérien'],
    456, validator_id, NOW() - INTERVAL '30 days',
    $json${
      "nb_sp_engages": 150,
      "duree_intervention": "14h",
      "nb_vehicules": 40,
      "sdis_impliques": ["06","13","83","84","30"],
      "surface_sinistree": "1 200 ha"
    }$json$::jsonb
  ) RETURNING id INTO r_pex;

  -- =========================================================================
  -- SIGNALEMENT — remontée rapide (en attente de validation)
  -- =========================================================================
  INSERT INTO rex (
    sdis_id, author_id, title, intervention_date, type, severity, status, visibility,
    type_production, description, tags, views_count
  ) VALUES (
    sdis_id_demo, demo_id,
    $t$Signalement — Défaut de coordination SP/MNS sur noyade en plage surveillée$t$,
    '2024-07-22', 'SAV', 'significatif', 'pending', 'sdis', 'signalement',
    $t$Lors d'une intervention pour noyade multiple, la coordination avec les maîtres-nageurs sauveteurs a été perfectible (canal de communication non défini, périmètre non tenu). À analyser pour un éventuel PEX.$t$,
    ARRAY['SAV','noyade','coordination'],
    45
  ) RETURNING id INTO r_signalement;

  -- =========================================================================
  -- Commentaires + mention (sur le RETEX 1)
  -- =========================================================================
  INSERT INTO comments (rex_id, author_id, content, mentions)
  VALUES (r_retex1, demo_id,
    $t$Excellent retour. La recommandation sur le canal radio dédié mériterait d'être généralisée à tous les groupements.$t$,
    '{}')
  RETURNING id INTO c_parent;

  INSERT INTO comments (rex_id, author_id, parent_id, content, mentions)
  VALUES (r_retex1, validator_id, c_parent,
    $t$D'accord. @Compte_Demo peux-tu rapprocher ce point du RETEX TMD ? Même problématique de transmissions.$t$,
    ARRAY[demo_id]::uuid[]);

  -- =========================================================================
  -- Favoris du compte démo
  -- =========================================================================
  INSERT INTO favorites (user_id, rex_id) VALUES (demo_id, r_retex1) ON CONFLICT DO NOTHING;
  INSERT INTO favorites (user_id, rex_id) VALUES (demo_id, r_retex3) ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Notifications du compte démo (non lues)
  -- =========================================================================
  INSERT INTO notifications (user_id, type, title, content, link, rex_id) VALUES
    (demo_id, 'validation', 'REX validé', $t$Votre REX « Feu d'entrepôt chimique » a été validé$t$, '/rex/' || r_retex1::text, r_retex1),
    (demo_id, 'mention', 'Vous avez été mentionné', $t$Un validateur vous a mentionné dans un commentaire$t$, '/rex/' || r_retex1::text || '#comments', r_retex1),
    (demo_id, 'comment', 'Nouveau commentaire', $t$Nouveau commentaire sur « Effondrement de parking souterrain »$t$, '/rex/' || r_retex2::text || '#comments', r_retex2);

  RAISE NOTICE 'Seed démo complet inséré : 3 RETEX, 1 PEX, 1 Signalement, 2 commentaires, 2 favoris, 3 notifications (auteur = %).', demo_id;
END $$;

-- ============================================================================
-- Vérification
-- ============================================================================
SELECT type_production, status, visibility, title
FROM rex
WHERE author_id = (SELECT id FROM profiles WHERE email = 'demo@retex360.fr')
ORDER BY intervention_date DESC;
