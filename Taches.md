# Liste des tâches — Enrichissement RETEX360

## ✅ Corrections effectuées (Phase qualité)

### Bugs critiques (B1–B12)
- [x] B1 : pendingCount codé en dur → requête Supabase réelle
- [x] B2 : rejection_reason manquant → migration 007 + types
- [x] B3 : conflit colonnes notifications (message vs content) → migration 003 corrigée
- [x] B4 : champs DGSCGC absents du formulaire d'édition → 10 champs ajoutés
- [x] B5 : pas de validation Zod sur POST /api/rex → validateRexByType()
- [x] B6 : stale closure dans deleteNotification → callback fonctionnel
- [x] B7 : StatsCards codées en dur → composant client + API /api/dashboard/stats
- [x] B8 : KpiCards fake setTimeout → données réelles via API
- [x] B9 : 4 SDIS codés en dur → chargement dynamique depuis Supabase
- [x] B10 : rôle validateur refusé → faux positif (code déjà correct)
- [x] B11 : ancien avatar non supprimé → nettoyage storage avant upload
- [x] B12 : pièces jointes orphelines → nettoyage storage avant suppression REX

### Défauts de conception (D1–D7)
- [x] D1 : doublon useNotifications → suppression lib/hooks/use-notifications.ts
- [x] D2 : doublon PRODUCTION_TYPE_CONFIG → renommé PRODUCTION_TYPE_RULES
- [x] D3 : boutons OAuth non fonctionnels → supprimés
- [x] D4 : checkbox "Se souvenir de moi" non connectée → supprimée
- [x] D5 : lien Analytics vers route inexistante → redirigé vers /dashboard
- [x] D6 : sidebar collapse non persisté → localStorage
- [x] D7 : stripHtml() incomplet → 9+ entités HTML supportées

### Améliorations qualité (6 corrections initiales)
- [x] DOMPurify pour sanitisation HTML
- [x] Error boundaries React
- [x] Nettoyage console.log → logger centralisé
- [x] Constantes centralisées (SEVERITY_CONFIG, STATUS_CONFIG, etc.)
- [x] Optimisation performances (memo, lazy loading)
- [x] Accessibilité (aria-labels, rôles ARIA)

### Points pré-présentation (P2–P6)
- [x] P2 : Seed des 97 SDIS → migration 008_all_sdis.sql
- [x] P3 : Export CSV des statistiques → API /api/dashboard/export + bouton
- [x] P4 : Suppression ancien endpoint validate → validation-actions redirigé vers /api/admin/rex/
- [x] P5 : Insight IA sidebar dynamique → composant SidebarAiInsight connecté à /api/dashboard/stats
- [ ] P6 : Inscription ouverte sans contrôle → restreindre l'inscription (whitelist domaine email, invitation admin, ou validation manuelle)

---

## 🔴 Priorité haute
1. Composant "Chiffres clés de l'intervention"

Créer un composant KeyFigures avec cards visuelles
Champs : nombre de SP engagés, durée d'intervention, bilan humain, nombre de véhicules, SDIS impliqués
Ajouter ces champs au modèle de données (migration SQL)
Intégrer dans le formulaire de création REX (section collapsible)
Afficher en haut de la vue détail avec icônes et couleurs

2. Timeline chronologique interactive

Créer un composant InterventionTimeline
Structure de données : tableau d'événements [{heure, titre, description, type}]
Types d'événements : alerte, arrivée, action, message radio, fin
Affichage horizontal ou vertical selon l'écran
Ajouter le champ chronologie (JSONB) au modèle de données

3. Prescriptions catégorisées

Remplacer ou compléter enseignements par prescriptions structurées
Catégories : Opérations, Prévention-Prévision, Formation, Technique, Autre
Créer un composant PrescriptionsEditor similaire à FocusThematiqueEditor
Chaque prescription : catégorie, description, responsable (optionnel), échéance (optionnel)

4. Export PDF professionnel

Refondre le template PDF pour ressembler au standard SDIS 74
Intégrer les chiffres clés en infographie
Ajouter la timeline chronologique
Mise en page soignée avec header SDIS, pagination, sommaire auto-généré


## 🟠 Priorité moyenne
5. Témoignages / Verbatims

Ajouter un champ temoignages (JSONB) au modèle
Structure : [{auteur_fonction, citation, contexte}]
Composant TemoignagesEditor pour ajouter/modifier des verbatims
Affichage stylisé avec guillemets et mise en forme citation

6. Collaboration inter-SDIS

Ajouter un champ sdis_collaborateurs (tableau de strings ou relation)
Sélecteur multi-SDIS dans le formulaire
Badge "Inter-SDIS" sur les cards REX concernés
Filtre par SDIS collaborateur dans la recherche avancée
Statistiques : "REX impliquant plusieurs SDIS"

7. Section "Description de l'ouvrage/site"

Ajouter un champ description_site (rich text)
Pour tunnels, bâtiments ERP, sites industriels, etc.
Informations techniques : dimensions, équipements de sécurité, plans ETARE associés

8. Conditions d'intervention

Ajouter des champs structurés pour les conditions météo/environnement
conditions_meteo : jour/nuit, météo, température, vent
Composant ConditionsEditor avec icônes visuelles
Affichage synthétique dans la vue détail


## 🟡 Priorité basse
9. Section "Pour aller plus loin"

Ajouter un champ ressources_complementaires (JSONB)
Liens vers documents ARVI, GDO, DDR, fiches ETARE
Structure : [{titre, type, url_ou_reference}]

10. Numérotation automatique des REX

Format : RETEX N° YYYY-XX (année + numéro séquentiel par SDIS)
Généré automatiquement à la validation
Affiché sur le PDF et dans l'interface
