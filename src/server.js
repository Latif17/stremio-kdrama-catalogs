const express = require('express');
const path = require('path');
const { fetchCatalog } = require('./mdl');
const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

app.get('/', (req, res) => {
    res.redirect('/configure');
});

app.get('/configure', (req, res) => {
    res.sendFile(path.join(__dirname, 'configure.html'));
});

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

app.get([
    '/:catalogChoices/catalog/:type/:id.json',
    '/:catalogChoices/catalog/:type/:id/:extra.json'
], async (req, res) => {
    const { type, id } = req.params;
    try {
        const metas = await fetchCatalog(id);
        res.json({ metas });
    } catch (error) {
        console.error(`Catalog fetch error for ${type}/${id}:`, error);
        res.status(500).json({ err: 'Internal Server Error', metas: [] });
    }
});

module.exports = app;

if (require.main === module) {
    app.listen(process.env.PORT || 7000, () => {
        console.log('Listening on port ' + (process.env.PORT || 7000));
    });
}
