

## Problem

Your project structure has all frontend files nested inside a `frontend/` directory, but Lovable requires `index.html`, `package.json`, and `vite.config.ts` at the project root to build and run properly. The app itself is working (as confirmed by the network logs showing successful login, data upload, and AI queries), but the build system cannot find the entry files.

## Solution

Move the key configuration files and source code from `frontend/` to the project root:

1. **Copy `frontend/package.json` to root `package.json`** - so Lovable can install dependencies and run the dev server.

2. **Copy `frontend/index.html` to root `index.html`** - so Vite can find the HTML entry point.

3. **Copy `frontend/vite.config.ts` to root `vite.config.ts`** - so Vite configuration is available at the root.

4. **Copy supporting config files to root:**
   - `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`
   - `frontend/tailwind.config.ts`
   - `frontend/postcss.config.js`
   - `frontend/components.json`
   - `frontend/eslint.config.js`

5. **Copy `frontend/src/` to root `src/`** - all React source code, components, hooks, pages, etc.

6. **Copy `frontend/public/` to root `public/`** - static assets like favicons.

7. **Update `vite.config.ts`** - remove `outDir: 'build'` (Lovable uses the default `dist`) and ensure the port is set to `8080` (Lovable's expected port).

8. **Ensure `frontend/supabase/` functions remain at `supabase/`** - edge functions should already be at the root `supabase/` level (the root `supabase/config.toml` already exists).

## Technical Details

- The root already has `src/integrations/supabase/client.ts` and `.env` with the correct Supabase configuration, so those will be preserved.
- The `frontend/src/integrations/supabase/client.ts` is identical to the root version, so no conflicts.
- The `backend/` directory with Python code is unrelated to the Lovable build and stays as-is.
- Edge functions under `frontend/supabase/functions/` need to be consolidated with `supabase/config.toml` at the root. The functions will be copied to `supabase/functions/`.

## Risks

- There may be duplicate files between `frontend/src/integrations/` and root `src/integrations/` that need to be reconciled (they appear identical).
- After migration, the `frontend/` directory can be kept temporarily but should eventually be removed to avoid confusion.

