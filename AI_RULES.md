# AI Rules

## Tech stack

- React 19 + TypeScript for all application code.
- Vite powers local development and builds via `@lovable.dev/vite-tanstack-config`.
- TanStack Start + TanStack Router are used for app structure and routing.
- File-based routes live in `src/routes/`, with the router created in `src/router.tsx` and generated route tree in `src/routeTree.gen.ts`.
- Tailwind CSS v4 is the styling system, configured in `src/styles.css`.
- shadcn/ui components are installed under `src/components/ui` with the `new-york` style.
- Radix UI primitives are available underneath shadcn/ui for accessible interactive components.
- Lucide React is the icon library.
- App data follows a layered structure: `src/domain` for types/repositories, `src/infrastructure` for storage/sync implementations, and `src/services/appServices.ts` as the UI-facing entry point.
- The current app uses local adapters and sync-oriented services, with notifications powered by Sonner.

## Library usage rules

- **Routing:** use `@tanstack/react-router` for navigation, links, route creation, and route state. Add or edit routes in `src/routes/`. Do not introduce React Router.
- **Page shells and layout:** keep route-level UI in route files and shared layout pieces in `src/components/`.
- **Styling:** use Tailwind utility classes for all styling. Prefer theme tokens from `src/styles.css` such as `bg-background`, `text-foreground`, `border-border`, `bg-primary`, and related semantic colors.
- **UI components:** use existing shadcn/ui components from `src/components/ui` first. Do not rewrite basic primitives like buttons, dialogs, inputs, badges, tables, drawers, tabs, or forms from scratch.
- **Icons:** use `lucide-react` for icons. Do not add another icon library unless there is a strong, app-specific reason.
- **Class names:** use the `cn()` helper from `@/lib/utils` when conditional or merged class names are needed.
- **Forms:** use `react-hook-form` for form state, shadcn form components for rendering, and `zod` with `@hookform/resolvers` for validation when validation is required.
- **Dates and formatting:** use `date-fns` for date logic and prefer shared formatting helpers from `src/lib/format.ts` when the app already exposes them.
- **Notifications:** use `sonner` for toast feedback. The toaster is already mounted in the root route.
- **Charts and data visualization:** use `recharts` together with the existing chart UI wrappers if the feature needs charts.
- **App data access:** UI code should call functions from `src/services/appServices.ts` or existing `src/lib/data.ts` exports rather than directly choosing storage implementations.
- **Architecture:** keep domain types in `src/domain/types`, repository contracts in `src/domain/repositories`, and concrete implementations in `src/infrastructure`.
- **Path imports:** prefer the `@/` alias for internal imports instead of deep relative paths.
- **Vite config:** do not manually add React, Tailwind, TanStack Start, tsconfig-paths, or Cloudflare plugins in `vite.config.ts`; they are already included by the shared config wrapper.
- **Generated and vendor-like files:** do not hand-edit `src/routeTree.gen.ts` or shadcn/ui primitive files unless the task explicitly requires it and there is no safer alternative.
