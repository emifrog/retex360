# Liste des tâches — Enrichissement RETEX360

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