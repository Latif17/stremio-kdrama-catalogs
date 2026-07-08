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
    { type: 'k drama', id: 'kdrama_trending_series', name: 'Trending K-Dramas', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }, { name: 'skip' }] },
    { type: 'k drama', id: 'kdrama_top_series', name: 'Top K-Dramas', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }, { name: 'skip' }] },
    { type: 'k drama', id: 'kdrama_trending_movie', name: 'Trending K-Movies', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }, { name: 'skip' }] },
    { type: 'k drama', id: 'kdrama_top_movie', name: 'Top K-Movies', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }, { name: 'skip' }] },
    { type: 'k drama', id: 'kdrama_airing_series', name: 'Top Airing K-Dramas', extra: [{ name: 'genre', isRequired: false, options: ['Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller'] }, { name: 'skip' }] }
];

const baseManifest = {
    id: 'org.kdramacatalog',
    version: '1.0.1',
    name: 'K-Drama Catalogs',
    description: 'Trending and Top Rated K-Dramas & K-Movies',
    types: ['k drama', 'series', 'movie'],
    resources: ['catalog', 'meta'],
    idPrefixes: ['tt'],
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

        // Inject RPDB poster if key is present and the item has an IMDb ID (starts with 'tt')
        if (typeof choices.rpdbkey === 'string' && choices.rpdbkey.trim() !== '') {
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

app.get([
    '/meta/:type/:id.json',
    '/:catalogChoices/meta/:type/:id.json'
], async (req, res) => {
    let { type, id, catalogChoices } = req.params;
    
    // Cinemeta doesn't understand "k drama" type. 
    // We map "k drama" to "series" for cinemeta requests by default.
    if (type === 'k drama') {
        type = 'series';
    }

    let choices = {};
    try {
        if (catalogChoices) choices = JSON.parse(catalogChoices);
    } catch(e) {}

    if (typeof choices.rpdbkey === 'string' && choices.rpdbkey.trim() !== '' && id.startsWith('tt')) {
        try {
            const axios = require('axios');
            const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`);
            if (metaRes.data && metaRes.data.meta) {
                metaRes.data.meta.poster = `https://api.ratingposterdb.com/${choices.rpdbkey}/imdb/poster-default/${id}.jpg?fallback=true`;
            }
            res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=86400, stale-if-error=86400');
            return res.json(metaRes.data);
        } catch (e) {
            console.error('Error fetching meta from cinemeta:', e.message);
        }
    }
    
    res.redirect(307, `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`);
});

module.exports = app;

if (require.main === module) {
    app.listen(process.env.PORT || 7000, () => {
        console.log('Listening on port ' + (process.env.PORT || 7000));
    });
}
