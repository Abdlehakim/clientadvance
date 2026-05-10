# Owner Portal Deployment

## Separation

- The backend deploys separately.
- The owner portal deploys separately.
- The customer Tauri app does not include owner UI.
- The customer web frontend does not expose owner routes.

## Example domains

- Backend API: `https://api.yourdomain.com`
- Owner portal: `https://owner.yourdomain.com`

## Owner portal environment

Set the owner portal environment before building:

```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

## Deployment model

1. Deploy the backend API independently so `/api/admin/*` and the customer endpoints remain available.
2. Build the owner portal from `owner-portal/` and publish the generated static files separately from the customer app.
3. Keep the customer Tauri build and customer web deployment free of owner pages, owner navigation and owner key entry.

## Local and CI commands

```bash
cd owner-portal
npm install
npm run build
```

Optional root-level shortcuts:

```bash
npm run owner:dev
npm run owner:build
```

## Static hosting notes

- Deploy `owner-portal/dist` to the owner portal host only.
- Configure SPA fallback so `/dashboard`, `/companies`, `/admins`, `/licenses` and `/devices` all serve the portal `index.html`.
- Point the portal to the backend API with `VITE_API_BASE_URL`.

## Customer app scope

- The customer desktop application still handles client usage, payments and license activation.
- Owner license and company administration now lives only in the separate owner portal.
