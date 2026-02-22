# CONTEXTE PROJET HIGHWAY — À COLLER EN DÉBUT DE CONVERSATION

## Présentation
Highway est une application ERP custom pour une activité d'import/distribution alimentaire (produits UK → France). Stack : React + Vite + Supabase (PostgreSQL) + Vercel.

---

## Stack technique
- **Frontend** : React 18 + Vite + React Router + Lucide React + xlsx (export/import Excel)
- **Backend/BDD** : Supabase (PostgreSQL) — projet ID : `igybgbodxfnngstllnre`
- **Hébergement** : Vercel — repo GitHub : `Jordan-HW/Highway`, dossier racine `erp-app/`
- **Design** : fond gris clair #F5F4F8, accent violet #5A4A7A, sidebar violet foncé #2A1F40, font DM Sans
- **Logo** : texte "HIGHWAY" en violet clair #D4B8F0, slogan "ROAD TO THE FINEST"

---

## Accès Supabase (pour requêtes directes)
```
URL: https://igybgbodxfnngstllnre.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneWJnYm9keGZubmdzdGxsbnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDY0MTYsImV4cCI6MjA4NzA4MjQxNn0.coKV5HbOo2wtBH0iNVJ7Fk0YDrppk-bNrm0XMiW7YK4
```

---

## Structure des fichiers
```
Highway/
├── vercel.json                    (rewrites SPA : /* → /index.html)
├── HIGHWAY_CONTEXTE.md            (ce fichier)
└── erp-app/
    ├── index.html                 (titre : "Highway — Distribution")
    ├── package.json               (inclut "xlsx": "^0.18.5")
    ├── vite.config.js
    ├── .env                       (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    └── src/
        ├── main.jsx
        ├── App.jsx                (auth localStorage + routes par rôle)
        ├── index.css              (palette Highway + responsive mobile)
        ├── lib/supabase.js
        ├── components/
        │   ├── Sidebar.jsx        (responsive : fixe desktop / hamburger mobile)
        │   └── Toast.jsx
        └── pages/
            ├── Login.jsx          ✅ glassmorphism sur fond ardoise
            ├── Dashboard.jsx      ✅ stats globales
            ├── Marques.jsx        ✅ CRUD marques
            ├── Produits.jsx       ✅ CRUD complet — voir détail ci-dessous
            ├── ImportProduits.jsx ✅ import Excel avec mapping colonnes
            ├── Clients.jsx        ✅ CRUD complet
            ├── Stock.jsx          ✅ lots + alertes DLC
            ├── Utilisateurs.jsx   ✅ admins + accès portail
            ├── Fournisseurs.jsx   ✅ gestion fournisseurs
            └── Placeholders.jsx   ⏳ CommandesVente, CommandesAchat, Expeditions, Factures
```

---

## Authentification ERP
- Page Login vérifie table `admin_users` (email + mot_de_passe en clair)
- **Session persistée en localStorage** (clé `highway_user`) via `useState(() => JSON.parse(localStorage.getItem('highway_user')))` dans App.jsx
- 3 rôles : **admin** (accès total), **commercial** (pas gestion users), **comptable** (factures uniquement)
- Premier admin : `jordan.hadjez@gieunifrais.fr` / `highway2024`

---

## Page Produits — Fonctionnalités détaillées

### Tableau
- **Sélection de colonnes** : panneau latéral droit, 21 colonnes en 4 groupes (Général, Colisage, DLC, Douane), config persistée en `localStorage` (clé `highway_cols`)
- **Tri** : clic sur n'importe quel en-tête → tri ▲/▼, icône ↕ si inactif
- **Filtres par colonne** : ligne de champs sous les en-têtes, fond jaune si actif, bouton "✕ Reset"
- **Sélection de lignes** : checkbox par ligne + "tout sélectionner"
- **PhotoPanel** : panneau latéral max 380px au clic sur la miniature photo (responsive)

### Boutons header
- **Importer** → ouvre `ImportProduits` (modal 4 étapes)
- **Exporter** → ouvre `ExportModal` (Excel personnalisable)
- **Colonnes** → ouvre `ColumnPanel`
- **Nouveau produit** → modal création

### Import Excel (ImportProduits.jsx)
Flux en 4 étapes :
1. **Upload** — drag & drop ou sélection .xlsx/.xls/.csv
2. **Mapping** — colonnes du fichier associées aux champs Highway (auto-détection), aperçu des 2 premières valeurs
3. **Validation** — compteurs créations / mises à jour / erreurs. Produits existants (même EAN13) listés avec ancien→nouveau libellé
4. **Import** — "Créer uniquement" ou "Importer tout" (créations + MàJ)

### Modal produit — 4 onglets
- **Général** : EAN13, libellé, libellé court, marque (FK), catégorie (FK), ref marque, statut, description, photo URL, fiche technique URL
- **Colisage** : conditionnement, unité vente, PCB, poids brut/net, volume, L×l×H
- **DLC & Stockage** : température, temp min/max, type DLC, durée DLC
- **Import** : code douanier, pays origine, code Meursing

---

## Schéma BDD — Table `produits`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| ean13 | text | |
| libelle | text | obligatoire |
| libelle_court | text | |
| marque | text | texte libre legacy |
| marque_id | FK → marques | |
| categorie_id | FK → categories | |
| description | text | |
| ref_marque | text | |
| conditionnement | text | |
| unite_vente | text | |
| pcb | int | |
| poids_brut_kg / poids_net_kg | numeric | |
| volume_m3 | numeric | |
| longueur_cm / largeur_cm / hauteur_cm | numeric | |
| temperature_stockage | text | ambiant/frais/surgelé |
| temperature_min_c / temperature_max_c | numeric | |
| dlc_type | text | DLC/DLUO/DDM |
| dlc_duree_jours | int | |
| photo_url | text | URL externe CDN |
| fiche_technique_url | text | |
| statut | text | actif/inactif/en_référencement/arrêté |
| code_douanier | text | HSN code |
| pays_origine | text | |
| meursing_code | text | |

---

## Autres tables Supabase
| Table | Description |
|---|---|
| `marques` | Marques distribuées (M&S, etc.) |
| `categories` | Catégories produits |
| `clients` | Clients (centrale/indépendant/grossiste) |
| `tarifs_achat` | Prix achat HT par produit/marque |
| `tarifs_vente` | Prix vente HT général ou par client |
| `lots` | Lots avec DLC, localisation, statut |
| `mouvements_stock` | Entrées/sorties stock |
| `admin_users` | Utilisateurs ERP |
| `portail_acces` | Accès portail client |
| `client_fournisseurs_autorises` | Marques visibles par client sur portail |
| `commandes_achat` | ⏳ À construire |
| `commandes_vente` | ⏳ À construire |
| `expeditions` | ⏳ À construire |
| `factures` | ⏳ À construire |

---

## Produits importés
- **103 produits Marks & Spencer Food** importés via SQL
- Catégories : Ambient Celebration, Bakery, Biscuits, Confectionery, Groceries, Savouries
- Données douanières importées depuis DUTY_FEES.xlsx : HSN, COO (GB), Meursing codes

---

## Design System

### Couleurs CSS (index.css)
```css
--bg: #F5F4F8
--surface: #FFFFFF
--surface-2: #EEEDF4
--border: #E0DDE8
--primary: #5A4A7A          /* violet Highway */
--primary-hover: #4A3A66
--primary-light: #EDE9F6
--text-primary: #1A1820
--text-secondary: #6B6780
--text-muted: #9E9AB0
--danger: #C0392B
--success: #27AE60
--warning: #D4840A
```

### Sidebar
```css
background: #2A1F40          /* violet foncé */
logo color: #D4B8F0          /* violet clair */
```

### Composants CSS disponibles
`.btn` `.btn-primary` `.btn-secondary` `.btn-danger` `.btn-icon`
`.card` `.card-header` `.card-body`
`.modal` `.modal-overlay` `.modal-header` `.modal-body` `.modal-footer`
`.badge` `.badge-green` `.badge-red` `.badge-orange` `.badge-gray` `.badge-blue` `.badge-purple`
`.form-group` `.form-grid` `.form-grid-3` `.form-full`
`.table-container` `.tabs` `.tab`
`.filters-bar` `.search-input` `.filter-select`
`.stats-grid` `.stat-card` `.stat-label` `.stat-value`
`.page-header` `.page-body`
`.empty-state` `.loading` `.toast`
`.section-title` `.divider`

---

## Responsive Mobile (< 768px)
✅ **Entièrement fonctionnel** — testé iPhone

- **Sidebar** : hamburger menu + drawer animé
- **Page header** : boutons en grille 2x2
- **Page body** : padding réduit à 16px
- **Stats** : grille 2 colonnes
- **Filtres** : empilés verticalement
- **Tables** : scroll horizontal avec min-width
- **Modals** : pleine largeur, footer en colonne
- **Tabs** : scroll horizontal
- **PhotoPanel / ColumnPanel** : max-width au lieu de width fixe

---

## Conventions de code
- Composants JSX fonctionnel + hooks
- `import { supabase } from '../lib/supabase'`
- `import { toast } from '../components/Toast'`
- Dates : `toLocaleDateString('fr-FR')`
- Pas de TypeScript, pas de Tailwind
- **Fix payload Supabase** : toujours exclure les objets de jointure (`marques`, `categories`) avant `.update()` ou `.insert()` — ne passer que les colonnes scalaires

---

## Fixes techniques importants
- **404 au refresh Vercel** : `vercel.json` à la **racine du repo** (pas dans `erp-app/`) :
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- **Persistance session** : `useState(() => { try { return JSON.parse(localStorage.getItem('highway_user')) } catch { return null } })` dans App.jsx — NE PAS utiliser Supabase Auth
- **Persistance colonnes produits** : `localStorage.getItem('highway_cols')` dans Produits.jsx

---

## Fonctionnalités à construire (par priorité)
1. ⏳ **Commandes vente** — saisie, suivi, statuts
2. ⏳ **Commandes achat** — vers marques/fournisseurs
3. ⏳ **Expéditions** — préparation + envoi
4. ⏳ **Factures** — génération PDF
5. ⏳ **Portail client** — app séparée, login client, catalogue filtré, commandes
6. ⏳ **Tarification client** — prix spécifiques par client
7. ⏳ **Intégration EDI** — Carrefour, Franprix

---

## Développement avec Claude Code

### Repo local
```
C:\Users\jorda\Highway
```

### Commandes utiles
```bash
# Se placer dans le projet
cd C:\Users\jorda\Highway

# Voir les modifications
git status

# Commit et push
git add . && git commit -m "message" && git push

# Requête Supabase (exemple)
curl -s "https://igybgbodxfnngstllnre.supabase.co/rest/v1/produits?select=*&limit=5" \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"
```

### Workflow
1. Claude Code modifie les fichiers localement
2. Commit + push sur GitHub
3. Vercel redéploie automatiquement (1-2 min)
