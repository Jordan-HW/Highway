# CONTEXTE PROJET HIGHWAY — À COLLER EN DÉBUT DE CONVERSATION

## Présentation
Highway est une application ERP custom pour une activité d'import/distribution alimentaire (produits UK → France). Stack : React + Vite + Supabase (PostgreSQL) + Vercel.

---

## Stack technique
- **Frontend** : React 18 + Vite + React Router + Lucide React + xlsx (export/import Excel)
- **Backend/BDD** : Supabase (PostgreSQL) — projet ID : `igybgbodxfnngstllnre`
- **Hébergement** : Vercel — repo GitHub : `Jordan-HW/Highway`, dossier racine `erp-app/`
- **Design** : fond gris clair #F5F4F8, accent violet #5A4A7A, sidebar violet foncé #2A1F40, font Poppins
- **Logo** : texte "HIGHWAY" en violet clair #D4B8F0, slogan "ROAD TO THE FINEST"
- **Traduction** : Google Translate API (gratuit, détection auto de la langue source → FR)

---

## Accès & Credentials
Les credentials sont stockés localement et ne doivent JAMAIS être partagés :
- **Supabase Anon Key** : `erp-app/.env` (variable VITE_SUPABASE_ANON_KEY)
- **Supabase Service Role** : Dashboard Supabase → Settings → API
- **Supabase Management Token** : Dashboard Supabase → Account → Access Tokens
- **Script SQL local** : `supabase-query.sh` (gitignored, contient le token Management)

---

## Structure des fichiers
```
Highway/
├── vercel.json                    (rewrites SPA : /* → /index.html)
├── HIGHWAY_CONTEXTE.md            (ce fichier)
├── .gitignore                     (inclut supabase-query.sh)
└── erp-app/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── .env                       (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    └── src/
        ├── main.jsx
        ├── App.jsx                (auth localStorage + routes par rôle)
        ├── index.css              (palette Highway + responsive mobile, font Poppins)
        ├── lib/supabase.js
        ├── lib/i18n.js            ✅ displayLibelle, displayCategorieNom, displayCategoriePath,
        │                              buildCategoryTree, categorieSortKey, formatEan, translateToFr
        ├── components/
        │   ├── Sidebar.jsx        (responsive : fixe desktop / hamburger mobile)
        │   ├── Toast.jsx
        │   ├── LangToggle.jsx     ✅ toggle VO/FR compact
        │   ├── FamillePath.jsx    ✅ badge "Parent › Enfant" réutilisable (harmonisé partout)
        │   └── LogoUploader.jsx   ✅ upload logo vers Supabase Storage (bucket "logos")
        └── pages/
            ├── Login.jsx          ✅ auth via RPC sécurisé
            ├── Dashboard.jsx      ✅ stats globales
            ├── Marques.jsx        ✅ CRUD marques + contacts + familles hiérarchiques (2 niveaux) + drag reorder + logo
            ├── Produits.jsx       ✅ Catalogue — volet droit fiche produit + CRUD + Famille hiérarchique
            ├── ImportProduits.jsx ✅ import Excel avec mapping colonnes
            ├── Clients.jsx        ✅ CRUD complet + logo
            ├── Stock.jsx          ✅ lots + alertes DLC
            ├── Tarifs.jsx         ✅ gestion tarifs + marges + export PDF/Excel vue client (ExcelJS)
            ├── Utilisateurs.jsx   ✅ gestion via RPC sécurisé
            ├── Fournisseurs.jsx   ✅ gestion fournisseurs
            └── Placeholders.jsx   ⏳ CommandesVente, CommandesAchat, Expeditions, Factures
```

---

## Sécurité Supabase (RLS)

### Row Level Security activé sur toutes les tables

| Table | Protection |
|-------|------------|
| `admin_users` | RLS activé, **aucune policy** → accès uniquement via fonctions RPC |
| `produits` | RLS + policy "allow all" |
| `marques` | RLS + policy "allow all" |
| `categories` | RLS + policy "allow all" |
| `marque_contacts` | RLS + policy "allow all" |
| `clients` | RLS + policy "allow all" |
| `lots` | RLS + policy "allow all" |
| `portail_acces` | RLS + policy "allow all" |
| `tarif_historique` | RLS + policy "allow all" |
| `client_remises` | RLS + policy "allow all" |

### Fonctions RPC sécurisées (SECURITY DEFINER)

| Fonction | Usage |
|----------|-------|
| `login_admin(email, password)` | Authentification admin sans exposer le mot de passe |
| `list_admin_users()` | Liste les admins sans le champ mot_de_passe |
| `create_admin_user(...)` | Création admin sécurisée |
| `update_admin_user(...)` | Modification admin sécurisée |
| `delete_admin_user(id)` | Suppression admin |

### Points importants
- Les mots de passe admin ne sont JAMAIS envoyés au client
- La table `admin_users` n'est pas accessible en lecture directe
- Toutes les opérations admin passent par les fonctions RPC

---

## Authentification ERP
- Login via fonction RPC `login_admin` (vérifie côté serveur)
- **Session persistée en localStorage** (clé `highway_user`)
- 3 rôles : **admin** (accès total), **commercial** (pas gestion users), **comptable** (factures uniquement)

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
- **Volet détail produit** : pleine largeur mobile

---

## Design System

### Font
- **Poppins** (Google Fonts) partout — titres, corps, sidebar, login, codes
- Tailles harmonisées : 13px base, 12px labels/sous-titres, 11px headers table/badges, 18px titres page

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

---

## Conventions de code
- Composants JSX fonctionnel + hooks
- **Arrondi à 2 décimales** systématique en DB pour `pvpr`, `taux_tva`, `prix_achat_ht`, `prix_vente_ht`, `client_remises.pourcentage` — appliqué à l'import ET à la sauvegarde manuelle (inline, fiche produit). Jamais stocker plus de 2 décimales.
- `import { supabase } from '../lib/supabase'`
- `import { toast } from '../components/Toast'`
- Dates : `toLocaleDateString('fr-FR')`
- Pas de TypeScript, pas de Tailwind
- **Fix payload Supabase** : toujours exclure les objets de jointure avant `.update()` ou `.insert()`

---

## UX Patterns

### Fiches (Marques, Produits)
- **Mode lecture** par défaut : lignes compactes label (120px, muted) / valeur
- **Crayon** pour basculer en mode édition par section
- **Onglets** dans les modales/volets pour organiser les données

### Marques
- Modale 640px avec onglets : Infos, Contacts, Familles (si nomenclature spécifique)
- **Contacts multiples** : ligne compacte en lecture (nom — fonction · email · tél), crayon pour éditer
- **Nomenclature familles** : choix par marque entre générale ou spécifique
- **Familles générales** : gérées via bouton dédié dans le header de la page
- **Terminologie UI : "famille"** partout (ex-"catégorie"). La table DB reste `categories` et la colonne `categorie_id` — ne pas renommer.
- **Hiérarchie 2 niveaux** : famille parent → sous-famille via `categories.parent_id`. Icône **+** à côté du parent pour ajouter une sous-famille. Icône `CornerDownRight` et indentation pour sous-familles.
- **Édition inline** par ligne : crayon ouvre deux inputs (Nom VO + Traduction FR) avec bouton traduction auto Google Translate par ligne. Bouton **Traduire tout** en masse (familles sans `nom_fr`).
- **Ordre des familles** : drag & drop (GripVertical) pour réordonner parents entre eux et sous-familles au sein d'un même parent. Persisté dans `categories.ordre` (incréments de 10).
- **Logo marque** : upload via `<LogoUploader>` → Supabase Storage bucket `logos/marques/`. Stocké dans `marques.logo_url`.

### Familles / Sous-familles — règles de tri et d'affichage
- **Composant `<FamillePath>`** (`components/FamillePath.jsx`) : badge gris harmonisé `badge badge-gray` affichant `Parent › Enfant`. Parent en `text-muted`, enfant en couleur normale. Utilisé partout (Produits table, fiche produit, Tarifs vue produit + vue client).
- **`buildCategoryTree(cats, lang)`** (i18n.js) : liste plate → arbre 2 niveaux ordonné par `ordre` puis `nom`. Produit des options indentées `↳` dans les `<select>`.
- **`displayCategoriePath(cat, allCats, lang)`** : "Parent › Enfant" ou juste "Nom" si famille parent.
- **`categorieSortKey(catId, allCats, libelle)`** : clé de tri composite `{ordre_parent}_{ordre_sous}_{libelle_trim_lower}` avec produits sans famille → `999999_999999_...` (fin de liste).
- **Tri par famille** activé **par défaut** sur Produits.jsx et Tarifs.jsx (ascendant). Produits dans une sous-famille triés **alphabétiquement par libellé FR** (`displayLibelle(p, 'fr')`).
- **Filtre famille** inclut les sous-familles : filtrer par une famille parent affiche aussi tous les produits de ses sous-familles.

### Clients
- **Logo** : upload via `<LogoUploader>` → Supabase Storage bucket `logos/clients/`. Stocké dans `clients.logo_url`.

### Catalogue (Produits)
- **Clic sur ligne** → volet droit 620px (pas de modal) avec fiche complète
- **6 onglets** : Général, Colisage, Conservation, Ingrédients, Douane, Tarifs
- **Traduction auto** : description et ingrédients VO → FR via Google Translate
- **Type conditionnement** : unités (PCB) ou kg (poids colis)
- **Tooltip DLC** : icone info expliquant DLC/DLUO/DDM
- **Photo** : cliquable pour zoom plein écran
- **Modal création** séparée (nouveau produit uniquement)
- **Statuts** affichés avec majuscule (Actif, En référencement, Arrêté, Inactif)

### Référencement & Tarifs (Tarifs.jsx)
- **Vue par produit** : tableau inline avec colonnes EAN, Produit, TVA, Achat HT/TTC, Cession HT/TTC, PVC HT/TTC, Marge HW %/€, Marge Client %/€
- **Champs cliquables** : prix et TVA affichés sans cadre (soulignement pointillé), input au clic, validation au blur/Entrée
- **Marges éditables** : clic sur badge marge → input, recalcul automatique du prix de cession (marge HW) ou choix répercussion PVC/cession (marge client)
- **Calcul marges** : Marge HW = (Cession-Achat)/Cession, Marge Client = (PVC HT-Cession)/PVC HT. Badges colorés : vert ≥28%, orange ≥23%, rouge <23%
- **Surlignage intelligent** : jaune vif (#FFF176) sur le champ source du changement, jaune léger (#FFF9C4) sur les champs impactés
- **Accordéon clients** : lignes `<tr>` dans le même tableau (colonnes alignées). Affiche : nom client, remises, prix fixé, prix gén., après remises, Final HT/TTC, PVC, marges
- **Variation achat récente** : flèche ↑/↓ + % à côté de l'icône horloge si changement de prix d'achat dans les 30 derniers jours (rouge = hausse, vert = baisse)
- **Historique des prix** : icône horloge par produit → modale avec filtres par champ (Achat/Cession/PVC/TVA), tableau ancien→nouveau + variation %, source (manuel/import). Note : les clés DB restent `vente_ht` et `pvpr`, l'affichage utilise "Cession" et "PVC"
- **Vue par client** :
  - Colonnes : Réf., **EAN** (séparée), Produit, Marque, **Famille** (badge `<FamillePath>`), Cess. HT/TTC, Ap. rem., Remises, Rem. eff., Prix fixé, Prix eff., PVC HT/TTC, M. HW, M. Cl. — libellés raccourcis
  - Produit `minWidth: 240px` pour lisibilité
  - **Remise effective** = `1 − Π(1 − pi/100)` calculée depuis les pourcentages de la cascade (pas depuis les prix arrondis) → identique pour tous les produits où les mêmes remises s'appliquent
  - Bouton **Tout référencer** : insère en masse les références pour tous les produits filtrés non encore référencés (confirmation + toast)
  - Bouton toggle **Masquer non-référencés / Tous les produits**
- **Remises en cascade (client)** : scope par Fournisseur, par **Famille** (`categorie_id`), par Sélection de produits. Filtre multiplicatif dans `applyRemisesCascade(basePrice, remises, produitId, marqueId, categorieId)`. Table `client_remises` : `label, pourcentage, marque_id, categorie_id, produit_ids, ordre`
- **Tri colonnes** : clic sur en-tête → asc/desc avec flèches ▲/▼/↕. Actif dans les deux vues (produit + client), toutes colonnes sauf photo/actions. En-têtes avec `padding: 6px 6px` pour densité cohérente avec les cellules
- **Colonnes configurables** : panneau drag & drop (ordre) + cases visibilité, persisté en localStorage (`highway_tarifs_cols_produit`, `highway_tarifs_cols_client`)
- **Enregistrement global** : barre fixe en bas, surlignage par cellule des modifications en attente. `padding-bottom: 80px` ajouté au `page-body` quand la barre est active pour ne pas masquer la dernière ligne
- **Arrondi 2 décimales** : tous les prix et % arrondis `Math.round(x * 100) / 100` avant INSERT/UPDATE (saveRemise, saveClientPrix, saveAllDirty, Produits insert/update, import tarifs et produits)
- **Import Excel** : mapping colonnes, normalisation TVA, validation, import en masse avec logging historique
- **Export tarif client (PDF + Excel)** : bouton "Exporter" dans l'en-tête vue client, ouvre une modale avec :
  - **Format** : PDF (A4 paysage) ou Excel
  - **Étendue** : Référencés seuls / Tous les filtrés
  - **Titre** : éditable (défaut "Liste tarifaire") — on y inclut le nom client si besoin
  - **Colonnes sélectionnées** (ordonnées, draggables via GripVertical, numérotées, × pour retirer) + zone "Ajouter" avec les colonnes disponibles
  - Colonnes disponibles : Photo (PDF seulement), Code EAN, Désignation, Famille, Taux TVA, PVC HT/TTC, Tarif HT/TTC, **Remises** (multi-ligne `Nom -X%` en PDF ; éclatée en 1 colonne par remise en Excel), **Remise totale** (négatif), **Tarif net HT/TTC** (gras)
  - Les cols "Marque" a été retirée de la sélection : les marques apparaissent désormais **dans les en-têtes de groupe** (PDF) ou en colonne fixe (Excel).
- **Tri et langue forcés à l'export** :
  - Toujours en français (`libelle_fr`, `nom_fr`), indépendamment du toggle VO/FR à l'écran
  - Tri **marque → famille (ordre) → sous-famille (ordre) → libellé FR alphabétique** (via `categorieSortKey`)
- **PDF design** :
  - Police **Poppins** embarquée via `addFileToVFS` + `addFont` (public/fonts/Poppins-Regular.ttf + Poppins-Bold.ttf), fallback helvetica
  - Bande violette fine (`#5A4A7A`, 3 mm) en haut et en bas, corps blanc
  - En-tête compact : Logo Highway (12 mm) à gauche + **Mois Année** (ex. `Avril 2026`) en haut à droite en 12pt gras
  - Titre seul au centre-gauche (14pt gras) + séparateur violet clair
  - Nombre de références sous le titre
  - **En-têtes de groupe unique** par combo marque + famille/sous-famille, format `Marque › Famille › Sous-famille`, 9pt gras, fond violet clair `#EDE9F6`, minCellHeight 6mm
  - Hook `willDrawCell` : si un en-tête de famille ne peut pas afficher ≥ 2 lignes produits sur la page courante, saut de page forcé (anti-orphelin)
  - `rowPageBreak: 'avoid'` : aucun produit coupé entre deux pages
  - Table : fond primary sur en-têtes de colonnes, texte blanc. Lignes alternées `#F7F5FB`. Toutes colonnes centrées sauf **Désignation** (gauche)
  - EAN : largeur ≥ 30mm + `overflow: visible` → 13 chiffres sur une ligne
  - Photos produits préchargées en parallèle via canvas → dataURL, cliquables (lien vers `photo_url`)
  - Si colonne Photo absente mais `photo_url` dispo : petit lien "Voir photo ▸" sous la désignation
  - Pied de page : mention confidentialité dans la même écriture que le reste (pas d'italique) + `Page X / Y`
  - Pages suivantes : bande + logo compact + titre + pagination
- **Excel design (ExcelJS, pas `xlsx`)** :
  - **Logo Highway** embarqué réellement (`wb.addImage` depuis `/highway-logo-light.png`) en A1
  - Ligne 2 : titre (16pt gras) + nom client (13pt violet gras à droite)
  - Ligne 3 : nombre de références + date (Mois année, violet gras droite)
  - Ligne 4 : espacement
  - Ligne 5 : **en-tête de colonnes** violet primary `#5A4A7A` fond plein, texte blanc gras, centré
  - **Freeze panes** sur les 5 premières lignes
  - **Auto-filtre** activé sur la ligne 5 (les en-têtes réels, pas le titre) → tri/filtre pour le client
  - Lignes alternées `#F7F5FB`, bordures fines `#E0DDE8` entre toutes les cellules
  - Formats numériques : `0,00%` pour remises (fractions négatives), `#,##0.00 "€"` pour prix, `0,0 %` pour TVA
  - **Colonnes Marque + Famille + Sous-famille toujours en tête** (3 colonnes fixes), puis les colonnes user dans **l'ordre exact du modal**
  - Colonne `Remises appliquées` éclatée **en place** : 1 colonne par label de remise unique (ex: "Remise Carrefour 1", "Coop", ...) avec le pourcentage négatif en fraction
  - Photo = lien hyperlink "Voir" dans la cellule (pas d'image embarquée par produit)
  - Tarif net HT/TTC en gras
- **Fichiers** : `erp-app/public/highway-logo-light.png`, `erp-app/public/highway-logo-dark.png`, `erp-app/public/fonts/Poppins-*.ttf`
- **Dépendances** : `jspdf` + `jspdf-autotable` (PDF), **`exceljs`** (Excel, nouveau), `xlsx` (encore utilisé pour import)

---

## Tables Supabase
| Table | Description |
|---|---|
| `admin_users` | Utilisateurs ERP (protégé par RPC) |
| `marques` | Marques distribuées — champs : nom, code, pays, devise, delai_livraison_jours, conditions_paiement, adresse, notes, actif, **nomenclature_specifique**, **logo_url** |
| `marque_contacts` | Contacts par marque — champs : marque_id (FK), prenom, nom, fonction, email, telephone |
| `categories` | Familles produits — champs : nom, **nom_fr**, **parent_id** (FK auto → sous-famille 2 niveaux max), **ordre** (int, incréments de 10), **marque_id** (FK nullable, null = famille générale) |
| `produits` | Catalogue produits — champs classiques + **libelle_fr**, **libelle_court_fr**, **description_fr**, **ingredients_fr**, **type_conditionnement** (unites/kg), **poids_colis_kg**, **longueur/largeur/hauteur_colis_cm**, **poids_produit_brut_kg**, **poids_produit_net_kg** |
| `clients` | Clients (centrale/indépendant/grossiste) — **logo_url** |
| `tarifs_achat` | Prix achat HT par produit — champs : produit_id, prix_achat_ht, date_debut |
| `tarifs_vente` | Prix vente HT général (client_id=null) ou par client — champs : produit_id, client_id, prix_vente_ht, remise_pct, date_debut, notes |
| `tarif_historique` | **Historique des changements de prix** — champs : produit_id, champ (achat_ht/vente_ht/pvpr/tva), ancien_prix, nouveau_prix, date_changement, source (manuel/import) |
| `client_remises` | Remises en cascade par client — champs : client_id, label, pourcentage, ordre, marque_id, **categorie_id** (FK nullable → famille), produit_ids |
| `lots` | Lots avec DLC, localisation, statut |
| `mouvements_stock` | Entrées/sorties stock |
| `portail_acces` | Accès portail client |
| `client_fournisseurs_autorises` | Marques visibles par client sur portail |
| `fournisseurs` | Fournisseurs |
| `commandes_achat` | ⏳ À construire |
| `commandes_vente` | ⏳ À construire |
| `expeditions` | ⏳ À construire |
| `factures` | ⏳ À construire |

---

## Supabase Storage

### Bucket `logos` (public)
- Usage : logos de marques (dossier `marques/`) et de clients (dossier `clients/`)
- Upload via composant `<LogoUploader value={form.logo_url} onChange={url => set('logo_url', url)} folder="marques|clients" />`
- Policies : lecture/écriture/update/delete publiques (pas d'auth pour l'instant — à durcir quand l'app sera publiée)
- URL publique stockée dans `marques.logo_url` / `clients.logo_url`

---

## EAN / UPC
- **`formatEan(val)`** dans i18n.js : pad à gauche avec des zéros jusqu'à 13 caractères
- Les produits M&S utilisent souvent des UPC à 8 chiffres → on les affiche comme EAN-13 (7 zéros devant)
- Appliqué partout : table Produits, fiche produit, Tarifs vue produit + vue client, exports PDF/Excel
- Le champ de saisie reste libre — pas de padding lors de l'écriture, seulement à l'affichage

---

## Fonctionnalités à construire (par priorité)
1. ⏳ **Commandes vente** — saisie, suivi, statuts
2. ⏳ **Commandes achat** — vers marques/fournisseurs
3. ⏳ **Expéditions** — préparation + envoi
4. ⏳ **Factures** — génération PDF
5. ⏳ **Portail client** — app séparée, login client, catalogue filtré, commandes
6. ✅ **Tarification client** — prix spécifiques par client, remises en cascade
7. ⏳ **Intégration EDI** — Carrefour, Franprix

---

## Développement avec Claude Code

### Repo local
```
C:\Users\jorda\Highway
```

### Commandes utiles
```bash
cd C:\Users\jorda\Highway
git status
git add . && git commit -m "message" && git push
```

### Workflow
1. Claude Code modifie les fichiers localement
2. Claude Code exécute le SQL directement sur Supabase (via Management API)
3. Commit + push sur GitHub
4. Vercel redéploie automatiquement (1-2 min)

### Credentials nécessaires (à fournir en début de session)
- Aucun credential dans ce fichier pour raison de sécurité
- Les tokens sont stockés localement dans `supabase-query.sh`
- Si nouvelle session, récupérer les clés depuis le Dashboard Supabase
