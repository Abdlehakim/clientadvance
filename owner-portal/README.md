# Owner Portal

Portail web séparé pour la gestion propriétaire des entreprises, administrateurs, licences et appareils.

## Variables d'environnement

Créez un fichier `.env` dans `owner-portal/` :

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

## Démarrage local

```bash
cd owner-portal
npm install
npm run dev
```

Le portail démarre par défaut sur `http://localhost:4174`.

## Build

```bash
cd owner-portal
npm run build
```

Le build statique est généré dans `owner-portal/dist`.

## Authentification temporaire

Le portail utilise actuellement `x-owner-admin-key`.

- La clé est saisie par le propriétaire dans l'interface.
- Elle est stockée uniquement dans `sessionStorage`.
- Elle n'est pas embarquée dans le code frontend.

TODO: replace OWNER_ADMIN_KEY with real owner login before production.

## Backend

Le portail appelle le backend existant via `VITE_API_BASE_URL` et conserve les endpoints owner/admin déjà présents sous `/api/admin/*`.
