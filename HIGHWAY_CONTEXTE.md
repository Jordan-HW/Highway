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
            ├── Produits.jsx       ✅ Articles — volet droit fiche produit + CRUD
            ├── ImportProduits.jsx ✅ import Excel avec mapping colonnes
            ├── Clients.jsx        ✅ CRUD complet + onglets (infos, contacts, logistique, facturation)
            ├── Stock.jsx          ✅ lots + alertes DLC
            ├── Tarifs.jsx         ✅ Référencement et Tarifs — vue produit/client, remises cascade, prix fixés
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
- Modale 640px avec onglets : Infos, Contacts, Catégories (si nomenclature spécifique)
- **Contacts multiples** : ligne compacte en lecture (nom — fonction · email · tél), crayon pour éditer
- **Nomenclature catégories** : choix par marque entre générale ou spécifique
- **Catégories générales** : gérées via bouton dédié dans le header de la page

### Articles (Produits)
- **Clic sur ligne** → volet droit 620px (pas de modal) avec fiche complète
- **6 onglets** : Général, Colisage, Conservation, Ingrédients, Douane, Tarifs
- **Traduction auto** : description et ingrédients VO → FR via Google Translate
- **Type conditionnement** : unités (PCB) ou kg (poids colis)
- **Tooltip DLC** : icone info expliquant DLC/DLUO/DDM
- **Photo** : cliquable pour zoom plein écran
- **Modal création** séparée (nouveau produit uniquement)
- **Statuts** affichés avec majuscule (Actif, En référencement, Arrêté, Inactif)

### Clients
- Modale 640px avec **4 onglets** : Infos générales, Contacts, Logistique, Facturation
- **Contacts multiples** : même pattern que Marques (ligne compacte lecture, crayon pour éditer)
- Mode lecture/édition par section avec crayon

### Référencement et Tarifs
- **Vue par produit** : tableau avec photo, accordion inline au clic
  - Prix d'achat (éditable), tarif vente général (éditable)
  - Sous-table clients : prix client HT (éditable), après remises (calculé), prix fixé (optionnel), prix effectif
- **Vue par client** : sélection client → tableau de tous les produits
  - **Toggle référencement** : checkbox pour référencer/déréférencer un produit chez le client
  - Prix vente HT général, après remises (calculé), prix fixé (éditable), prix effectif
  - Badge **FIXÉ** (jaune) quand un prix override existe
  - Bouton X par ligne + bouton "Supprimer tous les prix fixés"
- **Remises en cascade** (par client) :
  - Chaque remise : label, pourcentage, fournisseur (marque), scope (tous produits ou sélection)
  - Product picker avec photos/recherche pour la sélection
  - Preview cascade : affiche l'enchaînement et le résultat
  - Logique : prix général → remises cascade → prix effectif (sauf si prix fixé = override)
- **Import Excel** : mapping colonnes, validation, aperçu

---

## Tables Supabase
| Table | Description |
|---|---|
| `admin_users` | Utilisateurs ERP (protégé par RPC) |
| `marques` | Marques distribuées — champs : nom, code, pays, devise, delai_livraison_jours, conditions_paiement, adresse, notes, actif, **nomenclature_specifique** |
| `marque_contacts` | Contacts par marque — champs : marque_id (FK), prenom, nom, fonction, email, telephone |
| `categories` | Catégories produits — champs : nom, parent_id, **marque_id** (FK nullable, null = générale) |
| `produits` | Catalogue produits — champs classiques + **description_fr**, **type_conditionnement** (unites/kg), **poids_colis_kg**, **longueur/largeur/hauteur_colis_cm**, **poids_produit_brut_kg**, **poids_produit_net_kg** |
| `clients` | Clients (centrale/indépendant/grossiste) |
| `client_contacts` | Contacts par client — champs : client_id (FK), prenom, nom, fonction, email, telephone |
| `client_produit_references` | Référencement produit par client — champs : client_id (FK), produit_id (FK), UNIQUE |
| `client_remises` | Remises en cascade par client — champs : client_id (FK), label, pourcentage, marque_id (FK nullable), produit_ids (uuid[] nullable = tous), ordre |
| `tarifs_achat` | Prix achat HT par produit/marque |
| `tarifs_vente` | Prix vente HT général (client_id NULL) ou prix fixé client (client_id renseigné) |
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

## Sidebar (navigation)
- **Catalogue** (section) : Marques, Articles
- **Commercial** (section) : Clients, Fournisseurs, Référencement et Tarifs
- **Logistique** (section) : Stock, Commandes achat, Commandes vente, Expéditions
- **Finance** (section) : Factures
- **Admin** (section, admin only) : Utilisateurs

## Fonctionnalités à construire (par priorité)
1. ⏳ **Commandes vente** — saisie, suivi, statuts
2. ⏳ **Commandes achat** — vers marques/fournisseurs
3. ⏳ **Expéditions** — préparation + envoi
4. ⏳ **Factures** — génération PDF
5. ⏳ **Portail client** — app séparée, login client, catalogue filtré, commandes
6. ⏳ **Intégration EDI** — Carrefour, Franprix

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
