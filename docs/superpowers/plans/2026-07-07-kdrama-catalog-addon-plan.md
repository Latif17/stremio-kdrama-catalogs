# K-Drama Catalog Addon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Stremio catalog addon for K-Dramas using MyDramaList metadata and Stremio's Cinemeta for IMDB ID mapping.

**Architecture:** A lightweight Node.js server using `stremio-addon-sdk`. It fetches data from an unofficial MyDramaList API (`kuryana`), dynamically maps the show titles to IMDB IDs via Stremio's `Cinemeta` service, and caches the results to avoid rate limits.

**Tech Stack:** Node.js, `stremio-addon-sdk`, `axios` (or native fetch), `lru-cache`, `jest`, `nock`.

## Global Constraints

- Must use `stremio-addon-sdk` for addon structure.
- Must heavily cache both MyDramaList API responses and Cinemeta ID mapping results to avoid rate limits.
- If an item cannot be mapped to an IMDB ID via Cinemeta, it must be excluded from the returned Stremio catalog.

---

### Task 1: Scaffolding and Initial Server Setup

**Files:**
- Create: `package.json`
- Create: `src/server.js`
- Create: `tests/server.test.js`

**Interfaces:**
- Consumes: N/A
- Produces: `package.json` with dependencies, `server.js` exporting an initialized Stremio Addon instance.

- [ ] **Step 1: Initialize project and install dependencies**

```bash
npm init -y
npm install stremio-addon-sdk axios lru-cache
npm install --save-dev jest nock supertest
```
Add `"test": "jest"` to `package.json` scripts.

- [ ] **Step 2: Write failing test for basic manifest**

```javascript
// tests/server.test.js
const request = require('supertest');
const { getInterface } = require('../src/server');

describe('Stremio Addon Server', () => {
    it('serves manifest.json', async () => {
        const addonInterface = getInterface();
        const { getRouter } = require('stremio-addon-sdk');
        const express = require('express');
        const app = express();
        app.use(getRouter(addonInterface));

        const res = await request(app).get('/manifest.json');
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe('org.kdramacatalog');
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest tests/server.test.js`
Expected: FAIL (getInterface is not a function / file not found)

- [ ] **Step 4: Implement basic manifest server**

```javascript
// src/server.js
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const manifest = {
    id: 'org.kdramacatalog',
    version: '1.0.0',
    name: 'K-Drama Catalogs',
    description: 'Trending and Top Rated K-Dramas from MyDramaList',
    types: ['series', 'movie'],
    catalogs: [
        { type: 'series', id: 'kdrama_trending', name: 'Trending K-Dramas' },
        { type: 'series', id: 'kdrama_top', name: 'Top K-Dramas' }
    ],
    resources: ['catalog']
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id }) => {
    return { metas: [] };
});

function getInterface() {
    return builder.getInterface();
}

module.exports = { builder, getInterface };

if (require.main === module) {
    serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/server.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/server.js tests/server.test.js
git commit -m "chore: scaffold project and basic stremio manifest"
```

---

### Task 2: Caching Service Layer

**Files:**
- Create: `src/cache.js`
- Create: `tests/cache.test.js`

**Interfaces:**
- Consumes: N/A
- Produces: `getCachedOrFetch(key, ttl, fetchFn)` function.

- [ ] **Step 1: Write failing test**

```javascript
// tests/cache.test.js
const { getCachedOrFetch } = require('../src/cache');

describe('Cache Service', () => {
    it('fetches once and caches subsequent calls', async () => {
        let callCount = 0;
        const fetchFn = async () => { callCount++; return 'data'; };
        
        const res1 = await getCachedOrFetch('test-key', 1000, fetchFn);
        const res2 = await getCachedOrFetch('test-key', 1000, fetchFn);
        
        expect(res1).toBe('data');
        expect(res2).toBe('data');
        expect(callCount).toBe(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/cache.test.js`
Expected: FAIL

- [ ] **Step 3: Implement cache service**

```javascript
// src/cache.js
const { LRUCache } = require('lru-cache');

const cache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 60, // 1 hour default
});

async function getCachedOrFetch(key, ttlMs, fetchFn) {
    if (cache.has(key)) {
        return cache.get(key);
    }
    const data = await fetchFn();
    cache.set(key, data, { ttl: ttlMs });
    return data;
}

module.exports = { getCachedOrFetch };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/cache.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cache.js tests/cache.test.js
git commit -m "feat: implement caching layer"
```

---

### Task 3: Cinemeta ID Mapping

**Files:**
- Create: `src/cinemeta.js`
- Create: `tests/cinemeta.test.js`

**Interfaces:**
- Consumes: `getCachedOrFetch` from `src/cache.js`
- Produces: `mapTitleToImdbId(title, type, releaseYear)`

- [ ] **Step 1: Write failing test**

```javascript
// tests/cinemeta.test.js
const nock = require('nock');
const { mapTitleToImdbId } = require('../src/cinemeta');

describe('Cinemeta ID Mapper', () => {
    it('maps title to imdb id correctly', async () => {
        nock('https://v3-cinemeta.strem.io')
            .get('/catalog/series/top/search=Squid%20Game.json')
            .reply(200, {
                metas: [
                    { name: 'Squid Game', imdb_id: 'tt10919420', releaseInfo: '2021-' }
                ]
            });
        
        const id = await mapTitleToImdbId('Squid Game', 'series', 2021);
        expect(id).toBe('tt10919420');
    });
    
    it('returns null if no exact year match', async () => {
        nock('https://v3-cinemeta.strem.io')
            .get('/catalog/series/top/search=Fake%20Show.json')
            .reply(200, {
                metas: [
                    { name: 'Fake Show', imdb_id: 'tt99999', releaseInfo: '2015-' }
                ]
            });
        
        const id = await mapTitleToImdbId('Fake Show', 'series', 2020);
        expect(id).toBe(null);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/cinemeta.test.js`
Expected: FAIL

- [ ] **Step 3: Implement Cinemeta matcher**

```javascript
// src/cinemeta.js
const axios = require('axios');
const { getCachedOrFetch } = require('./cache');

async function searchCinemeta(query, type) {
    const url = `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(query)}.json`;
    try {
        const response = await axios.get(url, { timeout: 5000 });
        return response.data.metas || [];
    } catch (e) {
        return [];
    }
}

async function mapTitleToImdbId(title, type, releaseYear) {
    const cacheKey = `cinemeta:${type}:${title}:${releaseYear}`;
    return getCachedOrFetch(cacheKey, 1000 * 60 * 60 * 24 * 7, async () => { // cache mapping for 7 days
        const metas = await searchCinemeta(title, type);
        if (!metas.length) return null;
        if (!releaseYear) return metas[0].imdb_id;
        
        const match = metas.find(m => {
            const year = m.year || (m.releaseInfo && m.releaseInfo.substring(0,4));
            return year === String(releaseYear);
        });
        
        return match ? match.imdb_id : null;
    });
}

module.exports = { mapTitleToImdbId };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/cinemeta.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cinemeta.js tests/cinemeta.test.js
git commit -m "feat: implement cinemeta title to imdb id mapper"
```

---

### Task 4: MyDramaList API Integration

**Files:**
- Create: `src/mdl.js`
- Create: `tests/mdl.test.js`

**Interfaces:**
- Consumes: `getCachedOrFetch` from `src/cache.js`, `mapTitleToImdbId` from `src/cinemeta.js`
- Produces: `fetchCatalog(catalogId)`

- [ ] **Step 1: Write failing test**

```javascript
// tests/mdl.test.js
const nock = require('nock');
const { fetchCatalog } = require('../src/mdl');
// Mock cinemeta mapping
jest.mock('../src/cinemeta', () => ({
    mapTitleToImdbId: jest.fn().mockResolvedValue('tt12345')
}));

describe('MDL Catalog Fetcher', () => {
    it('fetches trending list and maps to Stremio metas', async () => {
        nock('https://kuryana.vercel.app')
            .get('/api/v1/shows/top') // Note: We will use popular or top depending on the kuryana endpoints. Assume /top for now.
            .reply(200, [
                { title: 'Test Drama', year: 2023, poster: 'http://img.com/a.jpg' }
            ]);
        
        const metas = await fetchCatalog('kdrama_top');
        expect(metas).toHaveLength(1);
        expect(metas[0].id).toBe('tt12345');
        expect(metas[0].name).toBe('Test Drama');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/mdl.test.js`
Expected: FAIL

- [ ] **Step 3: Implement MDL fetcher**

```javascript
// src/mdl.js
const axios = require('axios');
const { getCachedOrFetch } = require('./cache');
const { mapTitleToImdbId } = require('./cinemeta');

const KURYANA_BASE = 'https://kuryana.vercel.app/api/v1'; // Or we can use an alternative if this fails.

async function fetchFromMDL(endpoint) {
    try {
        const response = await axios.get(`${KURYANA_BASE}${endpoint}`, { timeout: 10000 });
        return response.data;
    } catch(e) {
        return [];
    }
}

async function fetchCatalog(catalogId) {
    const cacheKey = `catalog:${catalogId}`;
    return getCachedOrFetch(cacheKey, 1000 * 60 * 60 * 6, async () => { // 6 hours
        let data = [];
        if (catalogId === 'kdrama_top') {
            data = await fetchFromMDL('/shows/top'); // Using generic endpoint, may need adjustment based on exact kuryana docs
        } else if (catalogId === 'kdrama_trending') {
            data = await fetchFromMDL('/shows/popular');
        }
        
        // Sometimes Kuryana wraps in { data: [...] } or { results: [...] }
        const items = Array.isArray(data) ? data : (data.results || data.data || []);
        
        const metas = [];
        for (const item of items) {
            // item.title or item.name, item.year or item.release_year
            const title = item.title || item.name;
            const year = item.year || (item.release_date && item.release_date.substring(0,4));
            if (!title) continue;
            
            const imdbId = await mapTitleToImdbId(title, 'series', year);
            if (imdbId) {
                metas.push({
                    id: imdbId,
                    type: 'series',
                    name: title,
                    poster: item.poster || item.thumb || item.image || ''
                });
            }
        }
        return metas;
    });
}

module.exports = { fetchCatalog };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/mdl.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/mdl.js tests/mdl.test.js
git commit -m "feat: implement MDL catalog fetcher with ID mapping"
```

---

### Task 5: Connecting Catalog Handler to Stremio Addon

**Files:**
- Modify: `src/server.js`

**Interfaces:**
- Consumes: `fetchCatalog` from `src/mdl.js`
- Produces: Working Stremio API endpoints

- [ ] **Step 1: Write integration test**

Modify `tests/server.test.js` to add:
```javascript
const { fetchCatalog } = require('../src/mdl');
jest.mock('../src/mdl', () => ({
    fetchCatalog: jest.fn().mockResolvedValue([{ id: 'tt123', type: 'series', name: 'Mock' }])
}));

it('handles catalog requests', async () => {
    const addonInterface = getInterface();
    const { getRouter } = require('stremio-addon-sdk');
    const express = require('express');
    const app = express();
    app.use(getRouter(addonInterface));

    const res = await request(app).get('/catalog/series/kdrama_trending.json');
    expect(res.statusCode).toBe(200);
    expect(res.body.metas[0].id).toBe('tt123');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/server.test.js`
Expected: FAIL (empty metas array)

- [ ] **Step 3: Update catalog handler in server.js**

Modify `src/server.js`:
```javascript
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { fetchCatalog } = require('./mdl');

const manifest = {
    // ... (keep manifest the same)
    id: 'org.kdramacatalog',
    version: '1.0.0',
    name: 'K-Drama Catalogs',
    description: 'Trending and Top Rated K-Dramas from MyDramaList',
    types: ['series', 'movie'],
    catalogs: [
        { type: 'series', id: 'kdrama_trending', name: 'Trending K-Dramas' },
        { type: 'series', id: 'kdrama_top', name: 'Top K-Dramas' }
    ],
    resources: ['catalog']
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id }) => {
    const metas = await fetchCatalog(id);
    return { metas };
});

function getInterface() {
    return builder.getInterface();
}

module.exports = { builder, getInterface };

if (require.main === module) {
    serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/server.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js tests/server.test.js
git commit -m "feat: connect MDL fetcher to Stremio catalog handler"
```
