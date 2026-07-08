# Quality of Life Improvements Design

## Objective
Implement Quality of Life (QoL) improvements from the `scratch-anime` addon into the KDrama addon. These include Configuration Page UI updates, RatingPosterDB (RPDB) integration, and Stremio-optimized HTTP caching headers.

## Architecture & Components

### 1. Configuration Page Redesign (`src/configure.html`)
- **UI Framework/Styling**: We will replace the basic CSS with a more robust, modern layout (inspired by PureCSS or similar modern minimal styles used in `scratch-anime`).
- **Layout Elements**:
  - Addon Logo placeholder, Addon Name, and Version text.
  - Form groups with clear checkboxes.
  - A dedicated section for "Catalog settings" vs "Choose catalogs".
- **Form Validation**:
  - The "Install Addon" button will use standard HTML5 form validation (`form.reportValidity()`) before generating the install link, ensuring required inputs (like RPDB key if enabled) are present.

### 2. RatingPosterDB (RPDB) Integration
- **Frontend Config**:
  - A checkbox for "Ratings on Posters (requires RPDB key)".
  - When toggled on, an input field for the API key appears dynamically.
  - An `onblur` event on the API key input will `fetch` the `https://api.ratingposterdb.com/{apiKey}/isValid` endpoint to validate the key, alerting the user and clearing the field if invalid.
  - The `rpdbkey` field is added to the configuration JSON encoded in the Stremio install link.
- **Backend Routing (`src/server.js`)**:
  - The dynamic manifest endpoint `/:catalogChoices/manifest.json` and catalog endpoint `/:catalogChoices/catalog/...` already parse the `catalogChoices` JSON. The `rpdbkey` will simply exist within this JSON object.
- **Meta Modification (`src/mdl.js` & `src/server.js`)**:
  - When returning metas from `fetchCatalog`, if `rpdbkey` is present in the `catalogChoices`, we will loop through the metas.
  - For each meta that has an `imdb_id` (the `id` field), we override the `poster` field with `https://api.ratingposterdb.com/{rpdbkey}/imdb/poster-default/{meta.id}.jpg?fallback=true`.
  - To keep `mdl.js` clean, this logic will be applied in `src/server.js` after calling `fetchCatalog`, mapping over the returned metas.

### 3. HTTP Caching Headers
- **Implementation (`src/server.js`)**:
  - On the `/:catalogChoices/catalog/:type/:id.json` and `/:catalogChoices/catalog/:type/:id/:extra.json` routes, before sending the JSON response, we will set the `Cache-Control` header.
  - Value: `public, max-age=14400, stale-while-revalidate=86400, stale-if-error=86400`
  - This ensures Stremio clients and edge caches cache the catalog for 4 hours and gracefully handle updates in the background.

## Data Flow
1. User visits `/configure`.
2. User selects catalogs and optionally inputs an RPDB key. Form validation ensures key validity.
3. User clicks Install; a `stremio://` link with the JSON config (including `rpdbkey`) is generated.
4. Stremio client requests the manifest. Backend parses config and generates the tailored manifest.
5. Stremio client requests a catalog. Backend queries cache or MDL.
6. Backend maps MDL results to IMDb IDs.
7. Backend modifies the poster URLs if an `rpdbkey` is present in the request config.
8. Backend returns JSON with optimal caching headers.

## Error Handling & Edge Cases
- **Invalid RPDB Key entered mid-session**: If a user enters an invalid key despite client-side validation (e.g. by manually crafting the URL), RPDB will simply fallback to the default poster or return an error image. The fallback parameter (`?fallback=true`) ensures a poster is still served.
- **No IMDb ID found**: If `mdl.js` cannot map a title to an IMDb ID, the original MDL poster will be retained, as RPDB requires an IMDb ID.

## Testing Strategy
- Manually load the `/configure` page and verify the UI looks polished.
- Test the RPDB key input with an invalid string; verify it shows an alert and clears the input.
- Install the addon locally with an RPDB key and without an RPDB key.
- Verify the network tab on the Stremio web client or browser to ensure the `Cache-Control` headers are set correctly on catalog requests.
- Verify the posters returned in the JSON are correctly pointing to RPDB when the key is provided.
