# Stremio K-Drama Catalog Addon Design Spec

## 1. Overview
The goal of this project is to create a new Stremio addon that provides catalogs specifically for Korean Dramas (both Series and Movies). This addon serves as a Korean-focused equivalent to the existing Stremio Anime Catalogs addon. It will source its metadata from TMDB (The Movie Database).

## 2. Architecture
*   **Runtime:** Node.js
*   **Framework/SDK:** `stremio-addon-sdk` (Official Stremio SDK)
*   **Data Fetching:** `axios` (to query the TMDB API)
*   **Environment Variables:** `dotenv` (to manage the TMDB API key)
*   **Caching:** In-memory caching (via Stremio SDK's built-in caching headers or a lightweight cache module) to prevent API rate limits.

## 3. Data Source (TMDB)
TMDB will be the sole provider of data. We will utilize the following TMDB API features:
*   **Filters:** `with_original_language=ko` or `origin_country=KR`.
*   **Endpoints:**
    *   `/trending/tv/week` & `/trending/movie/week`
    *   `/discover/tv` & `/discover/movie` (for Top Rated and Airing/Now Playing)
*   **ID Format:** The addon will prefix TMDB IDs with `tmdb:` (e.g., `tmdb:12345`). Stremio's default Cinemeta addon handles `tmdb:` IDs natively, ensuring rich metadata and stream discovery without further mapping.

## 4. Components (Catalogs)
The Stremio addon manifest will expose the following catalogs.

### Content Types
1.  `series` (K-Drama Series)
2.  `movie` (K-Drama Movies)

### Catalog Lists (For both `series` and `movie`)
1.  **Trending**
    *   ID: `kdrama_trending`
    *   Data: TMDB trending endpoint, filtered by Korean origin.
2.  **Top All Time**
    *   ID: `kdrama_top`
    *   Data: TMDB discover endpoint, sorted by `vote_average.desc` and `vote_count.gte=...`, filtered by Korean origin.
3.  **Airing / Now Playing**
    *   ID: `kdrama_airing`
    *   Data: TMDB discover endpoint filtered by current/recent dates for Series, and `now_playing` for Movies, filtered by Korean origin.

## 5. Data Flow
1.  **Request:** Stremio client requests a catalog (e.g., `/catalog/series/kdrama_trending.json`).
2.  **Cache Check:** Addon checks if the request is already cached.
3.  **Fetch Data:** If not cached, the addon builds the appropriate TMDB URL using the developer's API key and the necessary Korean filters, then issues a GET request.
4.  **Transform:** The addon maps TMDB's JSON array of items into an array of Stremio Meta Preview objects:
    *   `id`: `"tmdb:" + item.id`
    *   `type`: `"series"` or `"movie"`
    *   `name`: `item.name` or `item.title`
    *   `poster`: `"https://image.tmdb.org/t/p/w500" + item.poster_path`
5.  **Response:** The mapped array is returned to Stremio.

## 6. Testing & Error Handling
*   **Error Handling:** API failures from TMDB should be gracefully caught. The addon should return an empty array `[]` rather than crashing, and ideally log the error for debugging.
*   **Rate Limiting:** Caching responses is strictly required to avoid hitting TMDB rate limits.

## 7. Deployment
*   The code will be structured simply: `package.json`, `index.js`, and `.env` (for local development).
*   The application can be deployed to Vercel, Render, Heroku, or any server capable of running a Node.js process exposing a web port.
