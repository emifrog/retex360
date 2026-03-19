# Liste des taches — Enrichissement RETEX360

## ✅ Corrections effectuees (Phase qualite)

### Bugs critiques (B1–B12) : ✅ TERMINE
- [x] B1 : pendingCount code en dur → requete Supabase reelle
- [x] B2 : rejection_reason manquant → migration 007 + types
- [x] B3 : conflit colonnes notifications (message vs content) → migration 003 corrigee
- [x] B4 : champs DGSCGC absents du formulaire d'edition → 10 champs ajoutes
- [x] B5 : pas de validation Zod sur POST /api/rex → validateRexByType()
- [x] B6 : stale closure dans deleteNotification → callback fonctionnel
- [x] B7 : StatsCards codees en dur → composant client + API /api/dashboard/stats
- [x] B8 : KpiCards fake setTimeout → donnees reelles via API
- [x] B9 : 4 SDIS codes en dur → chargement dynamique depuis Supabase
- [x] B10 : role validateur refuse → faux positif (code deja correct)
- [x] B11 : ancien avatar non supprime → nettoyage storage avant upload
- [x] B12 : pieces jointes orphelines → nettoyage storage avant suppression REX

### Defauts de conception (D1–D7) : ✅ TERMINE
- [x] D1 : doublon useNotifications → suppression lib/hooks/use-notifications.ts
- [x] D2 : doublon PRODUCTION_TYPE_CONFIG → renomme PRODUCTION_TYPE_RULES
- [x] D3 : boutons OAuth non fonctionnels → supprimes
- [x] D4 : checkbox "Se souvenir de moi" non connectee → supprimee
- [x] D5 : lien Analytics vers route inexistante → redirige vers /dashboard
- [x] D6 : sidebar collapse non persiste → localStorage
- [x] D7 : stripHtml() incomplet → ameliore avec html-entities (decode robuste, toutes entities named/numeric/hex)

### Ameliorations qualite : ✅ TERMINE
- [x] DOMPurify pour sanitisation HTML
- [x] Error boundaries React
- [x] Nettoyage console.log → logger centralise (+ correlation IDs + Sentry prod)
- [x] Constantes centralisees (SEVERITY_CONFIG, STATUS_CONFIG, etc.)
- [x] Optimisation performances (memo, lazy loading, Suspense, cache API)
- [x] Accessibilite (aria-labels, roles ARIA, page declaration RGAA)

### Points pre-presentation (P2–P6)
- [x] P2 : Seed des 97 SDIS → migration 008_all_sdis.sql (avec ON CONFLICT DO NOTHING)
- [x] P3 : Export CSV des statistiques → API /api/dashboard/export + bouton (streaming par 500)
- [x] P4 : Suppression ancien endpoint validate → validation-actions redirige vers /api/admin/rex/
- [x] P5 : Insight IA sidebar dynamique → composant SidebarAiInsight connecte a /api/dashboard/stats
- [ ] P6 : Inscription ouverte sans controle → **prevu Phase 7A du PlanAction** (whitelist domaines email, invitation tokenisee, mode inscription desactivee par SDIS)

---

## 🔴 Priorite haute : ✅ TERMINE

### 1. Chiffres cles de l'intervention ✅
- [x] Composant KeyFigures avec cards visuelles + icones
- [x] Champs : SP engages, duree, bilan humain, vehicules, SDIS impliques
- [x] Migration SQL 005_key_figures.sql
- [x] Integre dans le formulaire de creation REX (section collapsible)
- [x] Affichage en infographie dans la vue detail + export PDF

### 2. Timeline chronologique interactive ✅
- [x] Composant InterventionTimeline
- [x] Structure : tableau d'evenements [{heure, titre, description, type}]
- [x] Types d'evenements colores : alerte, arrivee, action, message radio, fin
- [x] Affichage vertical avec ligne de connexion
- [x] Layout responsive : vertical automatique sur mobile (Phase 6)
- [x] Champ chronologie (JSONB) — migration 006
- [x] Integre dans l'export PDF avec couleurs

### 3. Prescriptions categorisees ✅
- [x] PrescriptionsEditor similaire a FocusThematiqueEditor
- [x] Categories : Operations, Prevention-Prevision, Formation, Technique, Autre
- [x] Chaque prescription : categorie, description, responsable, echeance, statut
- [x] Statuts : A faire, En cours, Fait
- [x] Integre dans l'export PDF (groupees par categorie)

### 4. Export PDF professionnel ✅ (+ ameliorations Phase 5E)
- [x] Template PDF standard SDIS avec header, pagination
- [x] Chiffres cles en infographie
- [x] Timeline chronologique coloree
- [x] Prescriptions groupees par categorie
- [x] Images/pieces jointes integrees (max 10, grille 2 colonnes)
- [x] Anonymisation cote serveur (email non fetche, full_name masque)
- [x] Cache ETag + If-None-Match → 304 Not Modified
- [x] Rate-limit dedie PDF (10/min)
- [x] Monitoring : correlation ID, duree, taille, alertes si > 25s ou > 10Mo
- [x] Gardes anti-OOM : 200 items max, 100k chars/champ, 5MB total JSON
- [x] stripHtml → html-entities decode (toutes entities)
- [x] Font inutile supprimee (-500ms par PDF)
- [x] Timeout Vercel 60s (au lieu de 30s)

---

## 🟠 Priorite moyenne : ✅ TERMINE (5, 6, 7)

### 5. Temoignages / Verbatims ✅
- [x] Migration 010 : champ temoignages (JSONB) + trigger validation + index GIN
- [x] Type Temoignage : {id, auteur_fonction, citation, contexte}
- [x] Composant TemoignagesEditor (collapsible, ajout/suppression, champs auteur/citation/contexte)
- [x] Composant TemoignagesList (blockquote stylise avec guillemets francais)
- [x] Integre dans rex-form.tsx (visible PEX + RETEX)
- [x] Integre dans rex-detail.tsx (affichage)
- [x] Integre dans rex-template.tsx (export PDF avec bordure ambre)
- [x] API POST/PUT /api/rex mises a jour

### 6. Collaboration inter-SDIS ✅
- [x] Champ sdis_impliques dans key_figures (selecteur existant dans KeyFiguresEditor)
- [x] Badge "Inter-SDIS" sur les cards REX (rex-card.tsx) — detecte automatiquement via key_figures
- [x] Badge "Inter-SDIS" dans les resultats de recherche (search-results.tsx)
- [x] Filtre "Inter-SDIS uniquement" dans la recherche avancee (search-filters.tsx) — checkbox + query JSONB
- [ ] Statistiques : "REX impliquant plusieurs SDIS" (optionnel, dashboard futur)

### 7. Section "Description de l'ouvrage/site" ✅
- [x] Migration 010 : champ description_site (TEXT)
- [x] Editeur TiptapEditor integre dans rex-form.tsx (visible PEX + RETEX)
- [x] Affichage dans rex-detail.tsx avec sanitizeHtml
- [x] Export PDF (stripHtml)
- [x] API POST/PUT /api/rex mises a jour

### 8. Conditions d'intervention
- [ ] Ajouter des champs structures pour les conditions meteo/environnement
- [ ] conditions_meteo : jour/nuit, meteo, temperature, vent
- [ ] Composant ConditionsEditor avec icones visuelles
- [ ] Affichage synthetique dans la vue detail

---

## 🟡 Priorite basse : ✅ TERMINE

### 9. Section "Pour aller plus loin" ✅
- [x] Migration 011 : champ ressources_complementaires (JSONB) + trigger validation + index GIN
- [x] Type RessourceComplementaire : {id, titre, type, url_ou_reference}
- [x] Types de documents : ARVI, GDO, DDR, ETARE, GTO, GNR, Autre
- [x] Composant RessourcesEditor (collapsible, selecteur type, titre, URL avec lien externe)
- [x] Composant RessourcesList (badges type + liens cliquables)
- [x] Integre dans rex-form.tsx (visible PEX + RETEX)
- [x] Integre dans rex-detail.tsx (affichage)
- [x] Integre dans rex-template.tsx (export PDF avec type en majuscules)
- [x] API POST/PUT /api/rex mises a jour

### 10. Numerotation automatique des REX ✅
- [x] Migration 011 : champ numero_rex (VARCHAR 20) + index unique partiel
- [x] Trigger SQL generate_numero_rex : format RETEX-{CODE_SDIS}-{ANNEE}-{XXX}
- [x] Generation automatique a la validation (status → 'validated')
- [x] Affiche dans rex-detail.tsx (Badge mono dans l'en-tete)
- [x] Affiche dans rex-template.tsx (PDF, sous le titre)
