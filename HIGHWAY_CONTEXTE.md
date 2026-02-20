# 🛣️ CONTEXTE PROJET HIGHWAY — À COLLER EN DÉBUT DE CONVERSATION

## Présentation
Highway est une application ERP custom pour une activité d'import/distribution alimentaire (produits UK vers la France). Stack : React + Vite + Supabase (PostgreSQL) + Vercel.

---

## Stack technique
- **Frontend** : React 18 + Vite + React Router + Lucide React
- **Backend/BDD** : Supabase (PostgreSQL) — projet ID : `igybgbodxfnngstllnre`
- **Hébergement** : Vercel — repo GitHub : `Highway`, dossier racine `erp-app/`
- **Design** : fond beige #F7F6F3, accent vert forêt #2D5A3D, font DM Sans
- **Logo** : photo `highway-logo.png` dans `src/assets/` (style rétro pop violet/rose/cyan)

---

## Structure des fichiers
```
Highway/
├── vercel.json
└── erp-app/
    ├── index.html          (titre : "Highway — Distribution")
    ├── package.json
    ├── vite.config.js
    ├── .env                (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    └── src/
        ├── main.jsx
        ├── App.jsx         (gestion auth + routes)
        ├── index.css
        ├── lib/supabase.js
        ├── assets/
        │   └── highway-logo.png
        ├── components/
        │   ├── Sidebar.jsx     (navigation + user info + logout)
        │   └── Toast.jsx
        └── pages/
            ├── Login.jsx           ✅ page de connexion
            ├── Dashboard.jsx       ✅
            ├── Fournisseurs.jsx    ✅ CRUD complet
            ├── Produits.jsx        ✅ CRUD complet (4 onglets)
            ├── Clients.jsx         ✅ CRUD complet
            ├── Stock.jsx           ✅ lots + alertes DLC
            ├── Utilisateurs.jsx    ✅ admins + accès portail
            └── Placeholders.jsx    ⏳ CommandesVente, CommandesAchat, Expeditions, Factures
```

---

## Base de données Supabase — Tables principales

| Table | Description |
|---|---|
| `fournisseurs` | Fournisseurs (M&S code MS01, etc.) |
| `produits` | Produits avec EAN, PCB, DLC, HSN, meursing_code, prix_conso_ttc |
| `categories` | Catégories produits (propres au fournisseur) |
| `clients` | Clients (centrale/indépendant/grossiste) |
| `tarifs_achat` | Prix achat HT par produit/fournisseur |
| `tarifs_vente` | Prix vente HT général ou par client |
| `lots` | Lots avec DLC, localisation, statut |
| `mouvements_stock` | Entrées/sorties stock |
| `admin_users` | Utilisateurs ERP (admin/commercial/comptable) |
| `portail_acces` | Accès portail client (login + mdp) |
| `client_fournisseurs_autorises` | Fournisseurs visibles par client sur le portail |
| `commandes_achat` | À construire |
| `commandes_vente` | À construire |
| `expeditions` | À construire |
| `factures` | À construire |

---

## Authentification ERP
- Page Login vérifie `admin_users` (email + mot_de_passe en clair pour l'instant)
- 3 rôles :
  - **admin** — accès total
  - **commercial** — lecture seule (pas de gestion utilisateurs)
  - **comptable** — factures uniquement
- Premier admin : `jordan.hadjez@gieunifrais.fr` / `highway2024`
- Session stockée en mémoire React (pas de localStorage)

---

## Portail client (À CONSTRUIRE)
- App séparée, URL distincte
- Login = identifiant texte libre (ex: `CARREFOUR01`) + mot de passe
- Catalogue filtré par fournisseurs autorisés
- Commande activable ou non par client (champ `peut_commander`)
- Infos visibles : photo, prix HT, prix conso TTC, ingrédients/allergènes, colisage, DLC

---

## Produits importés
- **103 produits Marks & Spencer Food** (code MS01) importés via SQL
- Catégories : Ambient Celebration, Bakery, Biscuits, Confectionery, Groceries, Savouries
- Champs : EAN13, PCB, poids, DLC (DLUO en jours), code douanier HSN, meursing_code, pays_origine (Royaume-Uni), prix_achat EUR, prix_vente_ht

---

## Fonctionnalités à construire (par priorité)
1. ⏳ **Photos produits** — upload ou URL depuis catalogue fournisseur
2. ⏳ **Portail client** — app séparée avec login/catalogue/commande
3. ⏳ **Commandes vente** — saisie + suivi
4. ⏳ **Commandes achat** — vers fournisseurs
5. ⏳ **Expéditions** — préparation + envoi
6. ⏳ **Factures** — génération PDF
7. ⏳ **Tarification client** — prix spécifiques par client
8. ⏳ **Intégration EDI** — Carrefour, Franprix

---

## Conventions de code
- Tous les composants en JSX fonctionnel avec hooks
- Supabase via `import { supabase } from '../lib/supabase'`
- Toast notifications via `import { toast } from '../components/Toast'`
- CSS custom dans `index.css` (classes : `.btn`, `.btn-primary`, `.btn-secondary`, `.card`, `.modal`, `.modal-overlay`, `.badge`, `.badge-green`, `.badge-red`, etc.)
- Dates affichées en `toLocaleDateString('fr-FR')`
- Pas de TypeScript, pas de Tailwind

---

## Comment uploader les fichiers sur GitHub
1. Naviguer dans le bon dossier du repo
2. Fichier existant : cliquer → icône crayon → remplacer → commit
3. Nouveau fichier : **Add file** → **Create new file** → nommer + coller → commit
4. Vercel redéploie automatiquement après chaque commit
