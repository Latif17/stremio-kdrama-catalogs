# KDrama Catalog Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the KDrama addon to use vanilla Express and dynamic URL-based manifest configuration, including a sleek `/configure` webpage.

**Architecture:** We will replace the `stremio-addon-sdk` builder with raw Express routes that intercept `/:catalogChoices/manifest.json` and serve dynamic manifests, replicating the architecture of `stremio-anime-catalogs`.

**Tech Stack:** Node.js, Express, Jest, Supertest.

## Global Constraints

- No external UI dependencies (Vanilla HTML/CSS/JS for configure page)
- Must be deployable on Vercel (export Express app in `api/index.js`)

---

### Task 1: Refactor Dependencies and App Entry Point

**Files:**
- Modify: `package.json`
- Modify: `api/index.js`

**Interfaces:**
- Produces: A standard Express app export in `api/index.js`

- [ ] **Step 1: Remove SDK dependency**

```bash
npm uninstall stremio-addon-sdk
```

- [ ] **Step 2: Write test for api/index.js**

Create `tests/api.test.js`:
```javascript
const request = require('supertest');
const app = require('../api/index.js');

describe('API Entry Point', () => {
    it('should initialize express app', async () => {
        expect(app).toBeDefined();
        expect(typeof app.use).toBe('function');
    });
});
```

- [ ] **Step 3: Run failing test**

Run: `npx jest tests/api.test.js`
Expected: FAIL (because api/index.js currently imports stremio-addon-sdk)

- [ ] **Step 4: Update api/index.js**

```javascript
const app = require('../src/server');

module.exports = app;
```

- [ ] **Step 5: Run passing test**

Run: `npx jest tests/api.test.js`
Expected: PASS (wait, src/server.js needs to export express app for this to pass. Let's create a minimal src/server.js export in the next step to ensure it passes).

- [ ] **Step 6: Update src/server.js mock export**

```javascript
const express = require('express');
const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

module.exports = app;

if (require.main === module) {
    app.listen(process.env.PORT || 7000, () => {
        console.log('Listening on port ' + (process.env.PORT || 7000));
    });
}
```

- [ ] **Step 7: Run test again**

Run: `npx jest tests/api.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json api/index.js tests/api.test.js src/server.js
git commit -m "refactor: drop stremio-addon-sdk and setup raw express app"
```

---

### Task 2: Build the Configuration Webpage

**Files:**
- Create: `src/configure.html`
- Modify: `src/server.js`

**Interfaces:**
- Produces: A static HTML route at `GET /configure` and root redirect.

- [ ] **Step 1: Write test for /configure route**

Create `tests/configure.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/server');

describe('Configuration Route', () => {
    it('should serve configure.html on /configure', async () => {
        const response = await request(app).get('/configure');
        expect(response.status).toBe(200);
        expect(response.text).toContain('KDrama Catalog Configuration');
    });

    it('should redirect / to /configure', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/configure');
    });
});
```

- [ ] **Step 2: Run failing test**

Run: `npx jest tests/configure.test.js`
Expected: FAIL (routes not defined)

- [ ] **Step 3: Create src/configure.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KDrama Catalog Configuration</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #121212; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .container { background: #1e1e1e; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); width: 100%; max-width: 400px; }
        h1 { margin-top: 0; font-size: 1.5rem; text-align: center; }
        .option { margin-bottom: 1rem; display: flex; align-items: center; }
        .option input { margin-right: 10px; }
        button { width: 100%; padding: 10px; background: #8a5a99; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; margin-top: 1rem; }
        button:hover { background: #714a7e; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Configure Addon</h1>
        <form id="configForm">
            <div class="option">
                <input type="checkbox" id="kdrama_trending" name="kdrama_trending" checked>
                <label for="kdrama_trending">Trending K-Dramas</label>
            </div>
            <div class="option">
                <input type="checkbox" id="kdrama_top" name="kdrama_top" checked>
                <label for="kdrama_top">Top K-Dramas</label>
            </div>
            <button type="button" onclick="generateInstallLink()">Install Addon</button>
        </form>
    </div>
    <script>
        function generateInstallLink() {
            const choices = {};
            if (document.getElementById('kdrama_trending').checked) choices.kdrama_trending = "on";
            if (document.getElementById('kdrama_top').checked) choices.kdrama_top = "on";
            
            const choicesStr = JSON.stringify(choices);
            let host = window.location.host;
            let installLink = 'stremio://' + host + '/' + encodeURIComponent(choicesStr) + '/manifest.json';
            window.location.href = installLink;
        }
    </script>
</body>
</html>
```

- [ ] **Step 4: Update src/server.js to serve the page**

Modify `src/server.js` (add before module.exports):
```javascript
const path = require('path');

app.get('/', (req, res) => {
    res.redirect('/configure');
});

app.get('/configure', (req, res) => {
    res.sendFile(path.join(__dirname, 'configure.html'));
});
```

- [ ] **Step 5: Run test to verify passes**

Run: `npx jest tests/configure.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/configure.html src/server.js tests/configure.test.js
git commit -m "feat: add configure page and root redirect"
```

---

### Task 3: Implement Manifest Routing

**Files:**
- Modify: `src/server.js`
- Create: `tests/manifest.test.js`

**Interfaces:**
- Produces: `GET /manifest.json` and `GET /:catalogChoices/manifest.json`

- [ ] **Step 1: Write test for manifests**

Create `tests/manifest.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/server');

describe('Manifest Routes', () => {
    it('should return base configurable manifest', async () => {
        const response = await request(app).get('/manifest.json');
        expect(response.status).toBe(200);
        expect(response.body.behaviorHints.configurable).toBe(true);
        expect(response.body.catalogs.length).toBe(0);
    });

    it('should return dynamic manifest based on choices', async () => {
        const choices = JSON.stringify({ kdrama_trending: "on" });
        const response = await request(app).get(`/${encodeURIComponent(choices)}/manifest.json`);
        expect(response.status).toBe(200);
        expect(response.body.catalogs.length).toBe(1);
        expect(response.body.catalogs[0].id).toBe('kdrama_trending');
        expect(response.body.behaviorHints).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run failing test**

Run: `npx jest tests/manifest.test.js`
Expected: FAIL

- [ ] **Step 3: Implement manifest routing in src/server.js**

Modify `src/server.js` (add before module.exports):
```javascript
const catalogsDef = [
    { type: 'series', id: 'kdrama_trending', name: 'Trending K-Dramas' },
    { type: 'series', id: 'kdrama_top', name: 'Top K-Dramas' }
];

const baseManifest = {
    id: 'org.kdramacatalog',
    version: '1.0.0',
    name: 'K-Drama Catalogs',
    description: 'Trending and Top Rated K-Dramas from MyDramaList',
    types: ['series', 'movie'],
    resources: ['catalog'],
    catalogs: [],
    behaviorHints: {
        configurable: true,
        configurationRequired: true
    }
};

app.get('/manifest.json', (req, res) => {
    res.json(baseManifest);
});

app.get('/:catalogChoices/manifest.json', (req, res) => {
    let choices = {};
    try {
        choices = JSON.parse(req.params.catalogChoices);
    } catch(e) {
        choices = {};
    }

    const dynamicManifest = JSON.parse(JSON.stringify(baseManifest));
    delete dynamicManifest.behaviorHints;
    
    dynamicManifest.catalogs = catalogsDef.filter(cat => choices[cat.id] === "on");
    
    res.json(dynamicManifest);
});
```

- [ ] **Step 4: Run test to verify passes**

Run: `npx jest tests/manifest.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js tests/manifest.test.js
git commit -m "feat: dynamic manifest generation based on URL params"
```

---

### Task 4: Implement Catalog Data Routing

**Files:**
- Modify: `src/server.js`
- Create: `tests/catalog.test.js`

**Interfaces:**
- Consumes: `src/mdl.js` (assumes `fetchCatalog(id)` returning an array of metas)
- Produces: `GET /:catalogChoices/catalog/:type/:id/:extra?.json`

- [ ] **Step 1: Write test for catalog fetching**

Create `tests/catalog.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/server');

// Mock mdl.js
jest.mock('../src/mdl', () => ({
    fetchCatalog: jest.fn().mockResolvedValue([{ id: 'test1', type: 'series', name: 'Test Drama' }])
}));

describe('Catalog Routes', () => {
    it('should return metas for selected catalog', async () => {
        const choices = JSON.stringify({ kdrama_trending: "on" });
        const response = await request(app).get(`/${encodeURIComponent(choices)}/catalog/series/kdrama_trending.json`);
        expect(response.status).toBe(200);
        expect(response.body.metas.length).toBe(1);
        expect(response.body.metas[0].name).toBe('Test Drama');
    });
});
```

- [ ] **Step 2: Run failing test**

Run: `npx jest tests/catalog.test.js`
Expected: FAIL

- [ ] **Step 3: Implement catalog handler in src/server.js**

Modify `src/server.js` (add before module.exports):
```javascript
const { fetchCatalog } = require('./mdl');

app.get('/:catalogChoices/catalog/:type/:id/:extra?.json', async (req, res) => {
    const { type, id } = req.params;
    try {
        const metas = await fetchCatalog(id);
        res.json({ metas });
    } catch (error) {
        console.error(`Catalog fetch error for ${type}/${id}:`, error);
        res.status(500).json({ err: 'Internal Server Error', metas: [] });
    }
});
```

- [ ] **Step 4: Run test to verify passes**

Run: `npx jest tests/catalog.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js tests/catalog.test.js
git commit -m "feat: catalog fetch routing via mdl.js"
```
