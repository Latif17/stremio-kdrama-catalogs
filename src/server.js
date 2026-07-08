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
    { type: 'k drama', id: 'kdrama_trending_series', name: 'Trending K-Dramas', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }] },
    { type: 'k drama', id: 'kdrama_top_series', name: 'Top K-Dramas', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }] },
    { type: 'k drama', id: 'kdrama_trending_movie', name: 'Trending K-Movies', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }] },
    { type: 'k drama', id: 'kdrama_top_movie', name: 'Top K-Movies', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }] }
];

const baseManifest = {
    id: 'org.kdramacatalog',
    version: '1.0.0',
    name: 'K-Drama Catalogs',
    description: 'Trending and Top Rated K-Dramas & K-Movies',
    types: ['k drama'],
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
    if (!choices || typeof choices !== 'object') choices = {};

    const dynamicManifest = JSON.parse(JSON.stringify(baseManifest));
    delete dynamicManifest.behaviorHints;
    
    // Support legacy "kdrama_trending" or "kdrama_top" as well as split ones
    dynamicManifest.catalogs = catalogsDef.filter(cat => {
        // If they checked the specific one (kdrama_trending_series) or the old generic one (kdrama_trending)
        const oldId = cat.id.replace('_series', '').replace('_movie', '');
        return choices[cat.id] === "on" || choices[oldId] === "on";
    });
    
    res.json(dynamicManifest);
});

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
                    return { ...meta, poster: `https://api.ratingposterdb.com/${choices.rpdbkey}/imdb/poster-default/${meta.id}.jpg?fallback=true` };
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

module.exports = app;

if (require.main === module) {
    app.listen(process.env.PORT || 7000, () => {
        console.log('Listening on port ' + (process.env.PORT || 7000));
    });
}
