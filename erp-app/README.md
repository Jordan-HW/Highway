# ERP Distribution Alimentaire

Application web de gestion pour import/distribution alimentaire.  
Base de données : Supabase | Interface : React + Vite | Hébergement : Vercel

## Fonctionnalités actuelles

- ✅ Tableau de bord
- ✅ Gestion des fournisseurs
- ✅ Catalogue produits (avec onglets : général, colisage, ingrédients, import/douane)
- ✅ Gestion des clients
- ✅ Stock & Lots avec alertes DLC
- 🔜 Commandes vente
- 🔜 Commandes achat
- 🔜 Expéditions
- 🔜 Facturation

## Déploiement sur Vercel

### 1. Mettre les fichiers sur GitHub

1. Allez sur votre dépôt GitHub `erp-distribution`
2. Uploadez tous ces fichiers en respectant la structure de dossiers

### 2. Déployer sur Vercel

1. Allez sur [vercel.com](https://vercel.com) et créez un compte (gratuit)
2. Cliquez "New Project" → Importez votre dépôt GitHub `erp-distribution`
3. Dans "Environment Variables", ajoutez :
   - `VITE_SUPABASE_URL` = `https://igybgbodxfnngstllnre.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = votre clé anon
4. Cliquez "Deploy"

### 3. Accès

Votre app sera disponible sur une URL type `https://erp-distribution.vercel.app`

## Structure des fichiers

```
erp-distribution/
├── index.html
├── package.json
├── vite.config.js
├── .env (ne pas uploader sur GitHub !)
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   └── supabase.js
    ├── components/
    │   ├── Sidebar.jsx
    │   └── Toast.jsx
    └── pages/
        ├── Dashboard.jsx
        ├── Fournisseurs.jsx
        ├── Produits.jsx
        ├── Clients.jsx
        ├── Stock.jsx
        └── Placeholders.jsx
```
