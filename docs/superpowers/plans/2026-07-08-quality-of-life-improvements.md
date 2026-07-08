# Quality of Life Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement UI improvements to the config page, add RPDB integration for rating posters, add caching headers, and fix missing metadata by proxying `meta` resource requests to Cinemeta.

**Architecture:** We are updating the `server.js` Express backend to handle caching headers, a new `/meta` proxy route, and intercepting catalog items to inject RPDB posters. The `configure.html` frontend is being completely overhauled with modern styling, validation, and a new RPDB key field.

**Tech Stack:** Express, Node.js, HTML/CSS, Jest

## Global Constraints

- No large external frontend frameworks; keep `configure.html` dependency-light (PureCSS/Vanilla HTML/JS).
- Maintain existing catalog structures and fallback behaviors.
- Ensure all new logic handles edge cases (invalid keys, missing data) gracefully.

---

### Task 1: Configuration Page Redesign & RPDB Form

**Files:**
- Modify: `src/configure.html`

**Interfaces:**
- Consumes: User interaction.
- Produces: A configured `stremio://` link with an embedded JSON config (which may include `rpdbkey`).

- [ ] **Step 1: Write the updated HTML/CSS design**

Replace the contents of `src/configure.html` with a much richer design that includes a logo, version, better styling, the RPDB API key input (hidden behind a checkbox toggle), and logic to fetch `isValid` on the RPDB key. Update the Javascript to enforce form validity before generating the link.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KDrama Catalog Configuration</title>
    <style>
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; width: 100%; min-height: 100%; }
        body { background: #121212; padding: 2vh; font-family: 'Open Sans', Arial, sans-serif; color: white; display: flex; justify-content: center; align-items: flex-start; }
        h1 { font-size: 3.5vh; font-weight: 700; margin: 0; }
        h2 { font-size: 2vh; font-weight: normal; font-style: italic; opacity: 0.8; margin: 0 0 2vh 0; }
        h3 { font-size: 2.2vh; border-bottom: 1px solid #333; padding-bottom: 1vh; margin-bottom: 2vh; }
        .container { background: #1e1e1e; padding: 4vh; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); width: 100%; max-width: 60vh; margin-top: 5vh; }
        .logo { height: 12vh; text-align: center; margin-bottom: 2vh; }
        .logo img { height: 100%; object-fit: contain; }
        .form-element { margin-bottom: 2vh; display: flex; align-items: center; }
        .form-element label { margin-left: 1vh; cursor: pointer; }
        .form-element.column { flex-direction: column; align-items: flex-start; }
        .form-element.column input[type="text"] { width: 100%; padding: 1vh; margin-top: 1vh; background: #333; border: 1px solid #555; color: white; border-radius: 4px; }
        .separator { margin-bottom: 3vh; }
        button { border: 0; color: white; background: #8A5AAB; padding: 1.5vh; width: 100%; text-align: center; font-size: 2.2vh; font-weight: 600; cursor: pointer; border-radius: 4px; transition: background 0.2s; margin-top: 1vh; }
        button:hover { background: #714a7e; }
        button.secondary { background: #4a4a4a; margin-top: 2vh; }
        button.secondary:hover { background: #333; }
        a { text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="https://m.media-amazon.com/images/G/01/imdb/images/social/imdb_logo._CB410901634_.png" alt="Logo">
        </div>
        <h1 style="text-align: center;">KDrama Catalogs</h1>
        <h2 style="text-align: center;">v1.0.0</h2>
        
        <form id="configForm">
            <h3>Addon Settings</h3>
            <div class="form-element">
                <input type="checkbox" id="ratings" name="ratings">
                <label for="ratings">Ratings on Posters (requires RPDB key)</label>
            </div>
            <div id="rpdb-data"></div>
            
            <div class="separator"></div>
            
            <h3>Choose Catalogs</h3>
            <div class="form-element">
                <input type="checkbox" id="kdrama_trending_series" name="kdrama_trending_series" checked>
                <label for="kdrama_trending_series">Trending K-Dramas (Series)</label>
            </div>
            <div class="form-element">
                <input type="checkbox" id="kdrama_trending_movie" name="kdrama_trending_movie" checked>
                <label for="kdrama_trending_movie">Trending K-Movies (Movies)</label>
            </div>
            <div class="form-element">
                <input type="checkbox" id="kdrama_top_series" name="kdrama_top_series" checked>
                <label for="kdrama_top_series">Top K-Dramas (Series)</label>
            </div>
            <div class="form-element">
                <input type="checkbox" id="kdrama_top_movie" name="kdrama_top_movie" checked>
                <label for="kdrama_top_movie">Top K-Movies (Movies)</label>
            </div>
            
            <button type="button" id="installBtn">INSTALL</button>
            <button type="button" class="secondary" id="copyBtn">COPY LINK</button>
        </form>
    </div>

    <script>
        const configForm = document.getElementById('configForm');
        const ratingsCheckbox = document.getElementById('ratings');
        const rpdbData = document.getElementById('rpdb-data');
        const installBtn = document.getElementById('installBtn');
        const copyBtn = document.getElementById('copyBtn');

        ratingsCheckbox.addEventListener('change', (event) => {
            if (event.currentTarget.checked) {
                rpdbData.innerHTML = `
                <div class="form-element column">
                    <label for="rpdbkey">RPDB API Key (get it from <a href="https://ratingposterdb.com/" target="_blank" style="color: #8A5AAB;">RatingPosterDB</a>)</label>
                    <input type="text" id="rpdbkey" name="rpdbkey" required placeholder="Enter your API Key"/>
                </div>`;
                const rpdbInput = document.getElementById('rpdbkey');
                rpdbInput.addEventListener('blur', () => {
                    const apiKey = rpdbInput.value;
                    if (!apiKey) return;
                    fetch('https://api.ratingposterdb.com/' + apiKey + '/isValid')
                        .then(async (resp) => {
                            let data = await resp.json().catch(() => ({}));
                            if (!data.valid) {
                                alert('RPDB Key is invalid, please try again');
                                rpdbInput.value = '';
                            }
                        })
                        .catch(() => alert('Could not validate RPDB key'));
                });
            } else {
                rpdbData.innerHTML = '';
            }
        });

        function getConfigObj() {
            const formData = new FormData(configForm);
            const config = {};
            for (let [key, value] of formData.entries()) {
                if (key !== 'ratings') {
                    config[key] = value;
                }
            }
            return config;
        }

        function getInstallLink(isStremioProtocol) {
            const config = getConfigObj();
            const configStr = encodeURIComponent(JSON.stringify(config));
            const host = window.location.host;
            const protocol = isStremioProtocol ? 'stremio:' : window.location.protocol;
            return protocol + '//' + host + '/' + configStr + '/manifest.json';
        }

        installBtn.onclick = () => {
            if (configForm.reportValidity()) {
                window.location.href = getInstallLink(true);
            }
        };

        copyBtn.onclick = () => {
            if (configForm.reportValidity()) {
                const link = getInstallLink(false);
                navigator.clipboard.writeText(link).then(() => {
                    alert('Link copied to clipboard!');
                }).catch(() => {
                    alert('Failed to copy. URL: ' + link);
                });
            }
        };
    </script>
</body>
</html>
```

- [ ] **Step 2: Run application to visually inspect**

Since it's an HTML file, there's no unit test required. We visually verify it parses correctly. Ensure it doesn't break basic Stremio configuration mechanics.

---

### Task 2: RPDB Backend Integration & Caching Headers

**Files:**
- Modify: `src/server.js`
- Modify: `tests/catalog.test.js`

**Interfaces:**
- Consumes: The `catalogChoices` parameter in the route URL.
- Produces: Catalogs with dynamically injected `rpdbkey` poster links and `Cache-Control` headers.

- [ ] **Step 1: Write a failing test for RPDB injection & headers in `tests/catalog.test.js`**

```javascript
describe('Catalog Routes with RPDB and Headers', () => {
    it('should inject RPDB poster when rpdbkey is provided and include Cache-Control header', async () => {
        const choices = JSON.stringify({ kdrama_trending: "on", rpdbkey: "test-key" });
        const response = await request(app).get(`/${encodeURIComponent(choices)}/catalog/series/kdrama_trending.json`);
        
        expect(response.status).toBe(200);
        expect(response.body.metas.length).toBe(1);
        expect(response.body.metas[0].poster).toBe('https://api.ratingposterdb.com/test-key/imdb/poster-default/test1.jpg?fallback=true');
        
        // Assert Cache-Control
        expect(response.headers['cache-control']).toBe('public, max-age=14400, stale-while-revalidate=86400, stale-if-error=86400');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL, because `Cache-Control` is not set and the `poster` URL is not the RPDB URL.

- [ ] **Step 3: Update `src/server.js` with Cache-Control headers and RPDB logic**

Modify the catalog route in `src/server.js` (around line 76):

```javascript
app.get([
    '/:catalogChoices/catalog/:type/:id.json',
    '/:catalogChoices/catalog/:type/:id/:extra.json'
], async (req, res) => {
    const { type, id, extra, catalogChoices } = req.params;
    
    let choices = {};
    try {
        choices = JSON.parse(catalogChoices);
    } catch(e) {
        choices = {};
    }

    let extraObj = {};
    if (extra && extra.startsWith('genre=')) {
        extraObj.genre = decodeURIComponent(extra.split('=')[1]).replace('.json', '');
    }
    
    try {
        let metas = await fetchCatalog(id, extraObj);
        
        // Inject RPDB poster if key is present and the item has an IMDb ID (starts with 'tt')
        if (choices.rpdbkey) {
            metas = metas.map(meta => {
                if (meta.id && meta.id.startsWith('tt')) {
                    meta.poster = `https://api.ratingposterdb.com/${choices.rpdbkey}/imdb/poster-default/${meta.id}.jpg?fallback=true`;
                }
                return meta;
            });
        }
        
        // Set HTTP Caching Headers
        res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=86400, stale-if-error=86400');
        res.json({ metas });
    } catch (error) {
        console.error(`Catalog fetch error for ${type}/${id}:`, error);
        res.status(500).json({ err: 'Internal Server Error', metas: [] });
    }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

Run: `git commit -am "feat: add rpdb integration and optimal caching headers to catalogs"`

---

### Task 3: Meta Resource Proxy

**Files:**
- Modify: `src/server.js`
- Create: `tests/meta.test.js`

**Interfaces:**
- Consumes: A Stremio meta request for `k drama` or `series`.
- Produces: A 307 Redirect to Cinemeta (`https://v3-cinemeta.strem.io/meta/...`).

- [ ] **Step 1: Write a failing test for Meta Resource Proxy**

Create `tests/meta.test.js`:

```javascript
const request = require('supertest');
const app = require('../src/server');

describe('Meta Proxy Route', () => {
    it('should redirect k drama meta requests to Cinemeta series endpoint', async () => {
        const response = await request(app).get('/%7B%7D/meta/k%20drama/tt1234567.json');
        
        expect(response.status).toBe(307);
        // "k drama" should map to "series" or "movie" in Cinemeta. 
        // We will default to "series" as it's the most common for KDrama.
        expect(response.headers.location).toBe('https://v3-cinemeta.strem.io/meta/series/tt1234567.json');
    });

    it('should redirect series meta requests to Cinemeta directly', async () => {
        const response = await request(app).get('/%7B%7D/meta/series/tt1234567.json');
        
        expect(response.status).toBe(307);
        expect(response.headers.location).toBe('https://v3-cinemeta.strem.io/meta/series/tt1234567.json');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL, returning 404 since `/meta` is not implemented.

- [ ] **Step 3: Update `src/server.js` manifest and meta route**

In `src/server.js`, modify `baseManifest`:

```javascript
const baseManifest = {
    id: 'org.kdramacatalog',
    version: '1.0.0',
    name: 'K-Drama Catalogs',
    description: 'Trending and Top Rated K-Dramas & K-Movies',
    types: ['k drama'],
    resources: ['catalog', 'meta'], // ADDED meta here
    catalogs: [],
    behaviorHints: {
        configurable: true,
        configurationRequired: true
    }
};
```

Add the new Meta proxy route below the catalog route:

```javascript
app.get([
    '/meta/:type/:id.json',
    '/:catalogChoices/meta/:type/:id.json'
], (req, res) => {
    let { type, id } = req.params;
    
    // Cinemeta doesn't understand "k drama" type. 
    // We map "k drama" to "series" for cinemeta requests by default.
    if (type === 'k drama' || type === 'k%20drama') {
        type = 'series';
    }
    
    res.redirect(307, `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/server.js tests/meta.test.js`
Run: `git commit -m "fix: proxy meta requests to cinemeta to resolve missing metadata"`
