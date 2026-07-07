# Stremio K-Drama Catalog Addon Design Spec

## 1. Overview
The goal of this project is to create a new Stremio addon that provides catalogs specifically for Korean Dramas (both Series and Movies). This addon serves as a Korean-focused equivalent to the existing Stremio Anime Catalogs addon. It will source its metadata from MyDramaList (via an unofficial API) and map the IDs dynamically to Stremio's native IMDB IDs.

## 2. Architecture
*   **Runtime:** Node.js
*   **Framework/SDK:** `stremio-addon-sdk` (Official Stremio SDK)
*   **Data Fetching:** `axios` (to query APIs)
*   **Caching:** In-memory caching (e.g. `lru-cache`) to heavily cache both MyDramaList API responses and the Cinemeta ID mapping results, minimizing network requests and preventing rate limits.

## 3. Data Source (MyDramaList + Cinemeta)
*   **Primary Data (Metadata):** We will use an open-source, unofficial MyDramaList API (e.g. `kuryana` hosted publicly, or our own scraper logic if needed) to fetch the Top K-Dramas, Trending, and Airing lists.
*   **ID Mapping (Cinemeta Hack):** Since MyDramaList IDs are not supported by Stremio, we will take the title and release year from MyDramaList, and programmatically query Stremio's official Cinemeta API (`https://v3-cinemeta.strem.io/catalog/{type}/top/search={title}.json`). We will extract the native `imdb_id` from the result where the title and year match.

## 4. Components (Catalogs)
The Stremio addon manifest will expose the following catalogs.

### Content Types
1.  `series` (K-Drama Series)
2.  `movie` (K-Drama Movies)

### Catalog Lists
1.  **Trending**
    *   ID: `kdrama_trending`
    *   Data: Top trending K-Dramas on MyDramaList.
2.  **Top All Time**
    *   ID: `kdrama_top`
    *   Data: Top-ranked K-Dramas on MyDramaList.
3.  **Airing / Latest**
    *   ID: `kdrama_airing`
    *   Data: Currently airing K-Dramas or Latest releases.

## 5. Data Flow
1.  **Request:** Stremio client requests a catalog (e.g., `/catalog/series/kdrama_trending.json`).
2.  **Cache Check:** Addon checks if the catalog list is already cached.
3.  **Fetch Data:** If not cached, the addon queries the MyDramaList API for the list of shows.
4.  **ID Mapping:** For each show in the list:
    *   Check if we already have its `imdb_id` mapped in our local ID cache.
    *   If not, search Cinemeta for the show's title, match the release year, and cache the returned `imdb_id`.
5.  **Transform:** The addon maps the data into Stremio Meta Preview objects:
    *   `id`: The discovered `imdb_id` (e.g., `tt1234567`)
    *   `type`: `"series"` or `"movie"`
    *   `name`: `item.title`
    *   `poster`: The cover image URL from MyDramaList.
6.  **Response:** The mapped array is returned to Stremio.

## 6. Testing & Error Handling
*   **Search Failures:** If Cinemeta search yields no matching `imdb_id`, that specific show is skipped from the catalog so it doesn't return unplayable dead items.
*   **Rate Limiting:** Heavy caching is required for the Cinemeta ID mapping to prevent spamming Stremio's servers.

## 7. Deployment
*   The application can be deployed to Vercel, Render, Heroku, or any Node.js server.
