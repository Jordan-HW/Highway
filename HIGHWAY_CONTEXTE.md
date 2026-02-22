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
        ├── index.css              (palette Highway + responsive mobile)
        ├── lib/supabase.js
        ├── components/
        │   ├── Sidebar.jsx        (responsive : fixe desktop / hamburger mobile)
        │   └── Toast.jsx
        └── pages/
            ├── Login.jsx          ✅ auth via RPC sécurisé
            ├── Dashboard.jsx      ✅ stats globales
            ├── Marques.jsx        ✅ CRUD marques
            ├── Produits.jsx       ✅ CRUD complet
            ├── ImportProduits.jsx ✅ import Excel avec mapping colonnes
            ├── Clients.jsx        ✅ CRUD complet
            ├── Stock.jsx          ✅ lots + alertes DLC
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
- **PhotoPanel / ColumnPanel** : max-width responsive

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

---

## Conventions de code
- Composants JSX fonctionnel + hooks
- `import { supabase } from '../lib/supabase'`
- `import { toast } from '../components/Toast'`
- Dates : `toLocaleDateString('fr-FR')`
- Pas de TypeScript, pas de Tailwind
- **Fix payload Supabase** : toujours exclure les objets de jointure avant `.update()` ou `.insert()`

---

## Tables Supabase
| Table | Description |
|---|---|
| `admin_users` | Utilisateurs ERP (protégé par RPC) |
| `marques` | Marques distribuées (M&S, etc.) |
| `categories` | Catégories produits |
| `produits` | 103 produits M&S importés |
| `clients` | Clients (centrale/indépendant/grossiste) |
| `tarifs_achat` | Prix achat HT par produit/marque |
| `tarifs_vente` | Prix vente HT général ou par client |
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
