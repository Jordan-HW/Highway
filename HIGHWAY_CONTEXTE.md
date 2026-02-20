# HIGHWAY — Fichier de contexte projet

> À coller en début de nouvelle conversation pour reprendre le projet.

---

## Présentation

**Highway** est un ERP web pour une activité d'import/distribution alimentaire **UK → France**.
- On importe des produits de marques britanniques (principalement **Marks & Spencer**)
- On les revend à des clients en France
- **Highway est le fournisseur** — on gère des **marques** (pas des fournisseurs)

---

## Stack technique

| Élément | Valeur |
|---|---|
| Framework | React + Vite |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth |
| Hébergement | GitHub → déploiement via Vercel ou similaire |
| Repo GitHub | `Highway` / dossier `erp-app/` |
| Design system | Beige `#F7F6F3`, vert forêt `#2D5A3D`, font DM Sans |

**Identifiants Supabase :**
- Project ref : `igybgbodxfnngstllnre`
- Service role key : `⚠️ à retrouver dans Supabase Dashboard → Settings → API`
- URL API : `https://igybgbodxfnngstllnre.supabase.co`

---

## Schéma base de données

### Tables existantes et confirmées

#### `marques` (ex `fournisseurs` — renommé)
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| nom | TEXT | |
| code | TEXT | |
| pays | TEXT | |
| devise | TEXT | EUR par défaut |
| delai_livraison_jours | INT | |
| contact_nom | TEXT | |
| contact_email | TEXT | |
| contact_telephone | TEXT | |
| conditions_paiement | TEXT | |
| adresse | TEXT | |
| notes | TEXT | |
| actif | BOOLEAN | |

#### `produits`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| ean13 | TEXT | |
| libelle | TEXT | |
| libelle_court | TEXT | |
| marque | TEXT | nom marque libre |
| description | TEXT | |
| marque_id | UUID FK | → marques(id) |
| categorie_id | UUID FK | → categories(id) |
| conditionnement | TEXT | |
| unite_vente | TEXT | carton/unité |
| pcb | INT | |
| poids_brut_kg | NUMERIC | |
| poids_net_kg | NUMERIC | |
| volume_m3 | NUMERIC | |
| longueur_cm | NUMERIC | |
| largeur_cm | NUMERIC | |
| hauteur_cm | NUMERIC | |
| temperature_stockage | TEXT | ambiant/frais/surgelé |
| temperature_min_c | NUMERIC | |
| temperature_max_c | NUMERIC | |
| dlc_type | TEXT | DLC/DLUO/DDM |
| dlc_duree_jours | INT | |
| ref_marque | TEXT | |
| photo_url | TEXT | URL externe (ex: M&S CDN) |
| fiche_technique_url | TEXT | |
| statut | TEXT | actif/inactif/en_cours |
| code_douanier | TEXT | |
| pays_origine | TEXT | |

#### `categories`
| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| nom | TEXT | Catégories propres à chaque marque |

#### `clients`
Table clients existante (détail non documenté ici).

#### `commandes_vente`
Table existante, colonne `statut` (dont valeur `facturée`).

---

## Architecture fichiers JSX (erp-app/src/)

```
src/
├── assets/
│   └── highway-logo.png        ← logo galaxy (image AI générée)
├── components/
│   └── Toast.jsx
├── lib/
│   └── supabase.js
├── pages/
│   ├── Dashboard.jsx
│   ├── Marques.jsx             ← ex Fournisseurs.jsx (renommé)
│   ├── Produits.jsx
│   ├── Clients.jsx
│   ├── CommandesVente.jsx      ← à construire
│   ├── CommandesAchat.jsx      ← à construire
│   ├── Stock.jsx               ← à construire
│   ├── Expeditions.jsx         ← à construire
│   ├── Factures.jsx            ← à construire
│   └── Utilisateurs.jsx        ← à construire
└── Sidebar.jsx
```

### Routes (App.jsx) — à vérifier/mettre à jour
```
/                   → Dashboard
/marques            → Marques       (ex /fournisseurs)
/produits           → Produits
/clients            → Clients
/commandes-vente    → CommandesVente
/commandes-achat    → CommandesAchat
/stock              → Stock
/expeditions        → Expeditions
/factures           → Factures
/utilisateurs       → Utilisateurs
```

---

## Fonctionnalités implémentées

### ✅ Dashboard
- Stats : produits, clients, marques, commandes en cours
- Liens rapides vers les sections principales

### ✅ Marques (ex Fournisseurs)
- CRUD complet
- Champs : nom, code, pays, devise, délai livraison, contact, adresse, notes, actif

### ✅ Produits
- CRUD complet avec modal multi-onglets (Général, Logistique, Commercial)
- Tableau avec colonnes : Photo, Libellé, EAN, Marque, **Catégorie**, Conditionnement, Stockage, DLC, Statut
- Filtres : recherche texte, filtre marque, **filtre catégorie**, filtre statut
- Miniature photo dans le tableau (cliquable → panneau latéral PhotoPanel)
- PhotoPanel : panneau droit 380px avec photo agrandie + infos produit
- `photo_url` : URL externe (ex: `https://assets.digitalcontent.marksandspencer.app/...`)
- **Fix payload** : les objets jointure (`marques`, `categories`) sont exclus avant save()

### ✅ Sidebar
- Navigation par sections : Principal, Catalogue, Commercial, Logistique, Finance, Administration
- Gestion des rôles : admin, commercial, comptable
- Logo Highway en haut

---

## Bugs connus / fixes appliqués

### Fix payload jointure (CRITIQUE)
Dans `Produits.jsx`, fonction `save()` :
```js
// TOUJOURS exclure les objets de jointure avant d'envoyer à Supabase
const { marques: _m, categories: _c, fournisseurs: _f, ...payload } = { ...form }
```
Sans ce fix → erreur `Could not find the 'marques' column of 'produits' in the schema cache`

### Colonnes ajoutées manuellement via SQL
Ces colonnes n'existaient pas dans le schéma initial et ont été ajoutées :
```sql
ALTER TABLE produits ADD COLUMN IF NOT EXISTS categorie_id UUID REFERENCES categories(id);
ALTER TABLE produits ADD COLUMN IF NOT EXISTS ref_marque TEXT;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS fiche_technique_url TEXT;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS code_douanier TEXT;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS pays_origine TEXT;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS libelle_court TEXT;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS volume_m3 NUMERIC;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS longueur_cm NUMERIC;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS largeur_cm NUMERIC;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS hauteur_cm NUMERIC;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS temperature_min_c NUMERIC;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS temperature_max_c NUMERIC;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

### Renommage fournisseurs → marques
```sql
ALTER TABLE fournisseurs RENAME TO marques;
ALTER TABLE produits RENAME COLUMN fournisseur_id TO marque_id;
ALTER TABLE tarifs_achat RENAME COLUMN fournisseur_id TO marque_id;
ALTER TABLE client_fournisseurs_autorises RENAME COLUMN fournisseur_id TO marque_id;
-- Note : categories n'avait pas de colonne fournisseur_id
NOTIFY pgrst, 'reload schema';
```

---

## Données existantes

- **103 produits M&S** importés dans la table `produits`
- Photos accessibles via le CDN M&S : `https://assets.digitalcontent.marksandspencer.app/image/upload/w_768,q_auto,c_fill,f_auto/{hash}.jpg`
- Les `photo_url` sont à renseigner manuellement produit par produit (pas d'automatisation active)

---

## À construire (backlog)

### Priorité haute
- [ ] **Commandes vente** — saisie commande client, lignes produits, statuts (brouillon → confirmée → expédiée → facturée)
- [ ] **Commandes achat** — approvisionnement marques, réception

### Priorité moyenne
- [ ] **Stock & Lots** — gestion des lots avec DLC, mouvements de stock
- [ ] **Expéditions** — préparation, bons de livraison
- [ ] **Factures** — génération PDF, suivi paiement

### Priorité basse
- [ ] **Portail client** — interface pour que les clients passent commande eux-mêmes
- [ ] **Utilisateurs & Accès** — gestion des rôles plus fine
- [ ] **Photos produits en masse** — script Open Food Facts par EAN13 ou import CSV

---

## Notes importantes

- **Pas d'accès réseau** depuis le sandbox Claude → impossible de faire des appels HTTP directs (GitHub API, Supabase REST). Tout se fait en générant des fichiers à uploader manuellement sur GitHub.
- Pour recharger le cache Supabase après une modif de schéma : `NOTIFY pgrst, 'reload schema';`
- Le GitHub PAT : `⚠️ à regénérer dans GitHub → Settings → Developer settings → PAT`
