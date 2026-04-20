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
        ├── components/
        │   ├── Sidebar.jsx        (responsive : fixe desktop / hamburger mobile)
        │   └── Toast.jsx
        └── pages/
            ├── Login.jsx          ✅ auth via RPC sécurisé
            ├── Dashboard.jsx      ✅ stats globales
            ├── Marques.jsx        ✅ CRUD marques + contacts multiples + catégories par marque
            ├── Produits.jsx       ✅ Catalogue — volet droit fiche produit + CRUD
            ├── ImportProduits.jsx ✅ import Excel avec mapping colonnes
            ├── Clients.jsx        ✅ CRUD complet
            ├── Stock.jsx          ✅ lots + alertes DLC
            ├── Tarifs.jsx         ✅ gestion tarifs achat/vente/clients + marges + historique
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
  - Colonnes : Réf., Produit, Marque, Cession HT/TTC, Ap. remises, Remises appliquées, **Remise eff.**, Prix fixé, Prix effectif, **PVC HT/TTC**, Marge HW, Marge Client
  - **Remise effective** = `1 − Π(1 − pi/100)` calculée depuis les pourcentages de la cascade (pas depuis les prix arrondis) → identique pour tous les produits où les mêmes remises s'appliquent
  - Bouton **Tout référencer** : insère en masse les références pour tous les produits filtrés non encore référencés (confirmation + toast)
  - Bouton toggle **Masquer non-référencés / Tous les produits**
- **Remises en cascade (client)** : scope par Fournisseur, par **Famille** (`categorie_id`), par Sélection de produits. Filtre multiplicatif dans `applyRemisesCascade(basePrice, remises, produitId, marqueId, categorieId)`. Table `client_remises` : `label, pourcentage, marque_id, categorie_id, produit_ids, ordre`
- **Tri colonnes** : clic sur en-tête → asc/desc avec flèches ▲/▼/↕. Actif dans les deux vues (produit + client), toutes colonnes sauf photo/actions. En-têtes avec `padding: 6px 6px` pour densité cohérente avec les cellules
- **Colonnes configurables** : panneau drag & drop (ordre) + cases visibilité, persisté en localStorage (`highway_tarifs_cols_produit`, `highway_tarifs_cols_client`)
- **Enregistrement global** : barre fixe en bas, surlignage par cellule des modifications en attente. `padding-bottom: 80px` ajouté au `page-body` quand la barre est active pour ne pas masquer la dernière ligne
- **Arrondi 2 décimales** : tous les prix et % arrondis `Math.round(x * 100) / 100` avant INSERT/UPDATE (saveRemise, saveClientPrix, saveAllDirty, Produits insert/update, import tarifs et produits)
- **Import Excel** : mapping colonnes, normalisation TVA, validation, import en masse avec logging historique

---

## Tables Supabase
| Table | Description |
|---|---|
| `admin_users` | Utilisateurs ERP (protégé par RPC) |
| `marques` | Marques distribuées — champs : nom, code, pays, devise, delai_livraison_jours, conditions_paiement, adresse, notes, actif, **nomenclature_specifique** |
| `marque_contacts` | Contacts par marque — champs : marque_id (FK), prenom, nom, fonction, email, telephone |
| `categories` | Familles produits (terminologie UI = "famille", schéma DB inchangé) — champs : nom, parent_id, **marque_id** (FK nullable, null = générale) |
| `produits` | Catalogue produits — champs classiques + **description_fr**, **type_conditionnement** (unites/kg), **poids_colis_kg**, **longueur/largeur/hauteur_colis_cm**, **poids_produit_brut_kg**, **poids_produit_net_kg** |
| `clients` | Clients (centrale/indépendant/grossiste) |
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
