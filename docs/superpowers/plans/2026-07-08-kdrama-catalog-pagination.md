# KDrama Catalog Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 20-item limit via memory pre-fetching, improve catalog cold boot by increasing mapping concurrency, and add a "Top Currently Airing" MDL catalog.

**Architecture:** Use `LRUCache` to store 5 pages (100 items) of pre-fetched data from MyDramaList. `server.js` parses the `skip` parameter and passes it to `mdl.js`, which uses `skip` to slice the large cached array, ensuring instant responses for pagination.

**Tech Stack:** Node.js, Express, Cheerio, Axios

## Global Constraints

- No local filesystem (`fs`) caching since it breaks on Vercel
- Must maintain existing Stremio catalog structure
- All tests use `jest`

---

### Task 1: Update Server Pagination & New Catalog Route

**Files:**
- Create: `tests/server.test.js`
- Modify: `src/server.js`

**Interfaces:**
- Consumes: `src/mdl.js:fetchCatalog(catalogId, extraObj, skip)`
- Produces: Dynamic manifest parsing and `skip` argument passing in `/catalog/type/id/extra.json` route.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/server.test.js
const request = require('supertest');
const app = require('../src/server');

describe('Server Routes', () => {
    it('responds to Top Airing K-Dramas manifest', async () => {
        const res = await request(app).get('/%7B%22kdrama_airing_series%22:%22on%22%7D/manifest.json');
        expect(res.statusCode).toBe(200);
        expect(res.body.catalogs.some(c => c.id === 'kdrama_airing_series')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/server.test.js`
Expected: FAIL due to missing 'kdrama_airing_series' in manifest response.

- [ ] **Step 3: Write minimal implementation**

Modify `src/server.js`:
Add to `catalogsDef`:
```javascript
const catalogsDef = [
    { type: 'k drama', id: 'kdrama_trending_series', name: 'Trending K-Dramas', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }] },
    { type: 'k drama', id: 'kdrama_top_series', name: 'Top K-Dramas', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }] },
    { type: 'k drama', id: 'kdrama_trending_movie', name: 'Trending K-Movies', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }] },
    { type: 'k drama', id: 'kdrama_top_movie', name: 'Top K-Movies', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }] },
    { type: 'k drama', id: 'kdrama_airing_series', name: 'Top Airing K-Dramas', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }] }
];
```

Update `/catalog` route extra/skip parsing around line 80:
```javascript
    let extraObj = {};
    let skip = 0;
    if (extra) {
        const extraString = decodeURIComponent(extra.replace('.json', ''));
        const parts = extraString.split('&');
        for (const part of parts) {
            if (part.startsWith('genre=')) extraObj.genre = part.split('=')[1];
            if (part.startsWith('skip=')) skip = parseInt(part.split('=')[1]);
        }
    }
    try {
        let metas = await fetchCatalog(id, extraObj, skip);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/server.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/server.test.js src/server.js
git commit -m "feat: add top airing catalog and parse skip parameter"
```

---

### Task 2: Update MDL Scraper for Pagination and Concurrency

**Files:**
- Create: `tests/mdl.test.js`
- Modify: `src/mdl.js`

**Interfaces:**
- Consumes: Nothing new
- Produces: `fetchCatalog(catalogId, extraObj, skip)` signature where it uses multi-page fetching and slices the return array.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/mdl.test.js
const { fetchCatalog } = require('../src/mdl');

describe('MDL Scraper', () => {
    it('slices array based on skip', async () => {
        const metasPage1 = await fetchCatalog('kdrama_trending_series', {}, 0);
        const metasPage2 = await fetchCatalog('kdrama_trending_series', {}, 20);
        
        expect(metasPage1.length).toBeLessThanOrEqual(20);
        expect(metasPage2.length).toBeLessThanOrEqual(20);
        if (metasPage1.length > 0 && metasPage2.length > 0) {
            expect(metasPage1[0].id).not.toBe(metasPage2[0].id);
        }
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/mdl.test.js`
Expected: FAIL because `skip` is not applied and page 1 is identical to page 2.

- [ ] **Step 3: Write minimal implementation**

Modify `src/mdl.js`:
Change `fetchFromMDL`:
```javascript
async function fetchFromMDL(typeId, sort, genreName, status) {
    const items = [];
    for (let page = 1; page <= 5; page++) {
        let url = `https://mydramalist.com/search?adv=titles&ty=${typeId}&co=3&so=${sort}&page=${page}`;
        if (genreName && GENRES[genreName]) url += `&ge=${GENRES[genreName]}`;
        if (status) url += `&st=${status}`;

        try {
            const response = await axios.get(url, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
                timeout: 10000 
            });
            const $ = cheerio.load(response.data);
            $('.box[id^="mdl-"]').each((i, el) => {
                const title = $(el).find('h6.title a').text().trim();
                const yearMatch = $(el).find('span.text-muted').text().match(/\b(19|20)\d{2}\b/);
                const year = yearMatch ? yearMatch[0] : '';
                let img = $(el).find('img.img-responsive').attr('data-src') || $(el).find('img.img-responsive').attr('src');
                if (img && img.includes('?')) img = img.split('?')[0];
                if (title) items.push({ title, year, poster: img });
            });
        } catch (e) {
            // Ignore single page errors to allow remaining pages to load
        }
    }
    return items;
}
```

Change `fetchCatalog`:
```javascript
async function fetchCatalog(catalogId, extra, skip = 0) {
    const genre = extra && extra.genre ? extra.genre : null;
    const cacheKey = `catalog:${catalogId}:${genre || 'all'}`;
    
    const cachedMetas = await getCachedOrFetch(cacheKey, 1000 * 60 * 60 * 6, async () => { 
        let typeId = 68; // series
        let metaType = 'series';
        let sort = 'popular';
        let status = null;
        
        if (catalogId.includes('movie')) { typeId = 77; metaType = 'movie'; }
        if (catalogId.includes('top')) sort = 'top';
        if (catalogId.includes('airing')) { sort = 'top'; status = 3; }
        
        const items = await fetchFromMDL(typeId, sort, genre, status);
        
        const metas = [];
        const concurrencyLimit = 20; // Increased for faster cold boots
        for (let i = 0; i < items.length; i += concurrencyLimit) {
            const chunk = items.slice(i, i + concurrencyLimit);
            const chunkPromises = chunk.map(async (item) => {
                const imdbId = await mapTitleToImdbId(item.title, metaType, item.year);
                if (imdbId) {
                    return { id: imdbId, type: metaType, name: item.title, poster: item.poster };
                }
                return null;
            });
            const results = await Promise.all(chunkPromises);
            for (const res of results) if (res) metas.push(res);
        }
        return metas;
    });

    return cachedMetas.slice(skip, skip + 20);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/mdl.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/mdl.test.js src/mdl.js
git commit -m "feat: pre-fetch 5 pages from MDL, slice array by skip parameter, increase concurrency"
```
