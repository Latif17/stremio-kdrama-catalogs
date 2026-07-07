# K-Drama Catalog Configuration Design

## Purpose
Adapt the `stremio-kdrama-catalogs` repository to use a raw Express architecture similar to `stremio-anime-catalogs`, enabling dynamic configuration of catalogs via an interactive HTML `/configure` webpage.

## Architecture

We will remove the `stremio-addon-sdk` dependency and replace it with a vanilla Express server to manage dynamic, prefix-based routing.

### Routing Scheme
1. **`GET /manifest.json`**
   - Returns a base manifest with `behaviorHints: { configurable: true, configurationRequired: true }`.
   - Forces Stremio to open the configuration page prior to installation.
2. **`GET /configure`**
   - Serves the static HTML configuration UI (`src/configure.html`).
3. **`GET /:catalogChoices/manifest.json`**
   - Parses `catalogChoices` from the URL.
   - Generates and returns a dynamically constructed manifest that includes only the catalogs selected by the user.
4. **`GET /:catalogChoices/catalog/:type/:id/:extra?.json`**
   - Handles the catalog requests.
   - Invokes existing `src/mdl.js` logic to fetch KDrama data based on the catalog `id` and returns it as a Stremio-compliant `{ metas: [...] }` object.

## Components & File Structure

* **`api/index.js`**
  - Updated to export the raw Express app directly for serverless deployment (e.g., Vercel).
* **`src/server.js`**
  - Completely rewritten to implement the Express routing described above.
  - Maintains a master list of available catalogs.
  - Generates the dynamic manifest based on the `catalogChoices` JSON string in the request parameter.
* **`src/configure.html`**
  - A responsive, aesthetic HTML page.
  - Contains checkboxes corresponding to available catalogs (e.g., "Trending K-Dramas", "Top K-Dramas").
  - On "Install", it serializes the selected checkboxes into a JSON object, encodes it, and creates a `stremio://` URL that redirects the user back to the Stremio app to finalize the addon installation.
* **`src/mdl.js`**
  - Retained for data fetching. Minor adaptations may be made to ensure it integrates seamlessly with the new raw Express route handler.
* **`package.json`**
  - Remove `stremio-addon-sdk`.

## Data Flow
1. User clicks the add-on install link, Stremio fetches `/manifest.json`.
2. Stremio redirects the user to `/configure` since configuration is required.
3. User selects "Trending K-Dramas" and clicks "Install".
4. The page redirects to `stremio://<host>/{"kdrama_trending":"on"}/manifest.json`.
5. Stremio installs the addon from the dynamic manifest endpoint.
6. When browsing Stremio, the app queries `/<host>/{"kdrama_trending":"on"}/catalog/series/kdrama_trending.json`.
7. `src/server.js` routes this to `src/mdl.js` which fetches the data from MyDramaList and responds.
