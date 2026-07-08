# KDrama Catalog Improvements Design Spec

## 1. Overview
This document outlines the architectural changes needed to fix the pagination issue (20 item limit), improve cache performance for instant loading, and add a "Top Currently Airing" catalog from MyDramaList (MDL) using the `src/` codebase.

## 2. Components & Architecture

### 2.1 Caching & Pagination (Approach B)
We will use a "Pre-fetch Batch" approach. When a catalog is requested, the server will scrape 5 pages of MDL (100 items) upfront, map all of them to IMDB IDs, and store the entire list in `LRUCache`. 

**Data Flow:**
1. Stremio requests `/catalog/series/kdrama_trending_series/skip=20.json`.
2. `server.js` parses the `skip=20` parameter.
3. `mdl.js` checks the `LRUCache` for the full 100-item list.
   - *Cache Miss*: Scrape pages 1 through 5 of MDL, execute Cinemeta mapping concurrently, cache the 100 items, and return items `20` to `40`.
   - *Cache Hit*: Instantly return items `20` to `40` from the cached array.

### 2.2 MyDramaList Integration & Mapping
We will update `src/mdl.js` to support multi-page scraping and the new "Currently Airing" status.
*   **Currently Airing:** MDL uses the parameter `&st=3` for currently airing shows. We will map the catalog ID `kdrama_airing_series` to append this to the MDL URL.
*   **Mapping Concurrency:** To reduce cold-start latency, the `mapTitleToImdbId` calls will be increased from a concurrency of 5 to 20. 

### 2.3 File Modifications

**`src/server.js`**
*   Add `{ type: 'k drama', id: 'kdrama_airing_series', name: 'Top Airing K-Dramas', ... }` to `catalogsDef`.
*   Parse `skip` from `req.params.extra` (e.g. `genre=Action&skip=20.json` or just `skip=20.json`).
*   Pass `skip` (default 0) to `fetchCatalog()`.

**`src/mdl.js`**
*   Modify `fetchFromMDL` to loop through pages 1 to 5 (or use `Promise.all` for parallel scraping of the 5 pages) to gather 100 items.
*   Add logic to check if `catalogId === 'kdrama_airing_series'`, and if so, append `&st=3` to the MDL search URL.
*   Modify `fetchCatalog` to handle slicing the cached array based on the `skip` parameter before returning to `server.js`.
*   Increase the `concurrencyLimit` variable from 5 to 20.

## 3. Error Handling & Edge Cases
*   If MDL scraping fails for a specific page, the system will swallow the error for that page and proceed with the remaining items to avoid taking down the whole catalog.
*   If `skip` exceeds the length of the cached array (e.g., skip=100), it will return an empty array, which signals to Stremio that it has reached the end of the catalog.
