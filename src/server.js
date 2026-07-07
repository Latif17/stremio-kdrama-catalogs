// src/server.js
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { fetchCatalog } = require('./mdl');

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
    try {
        const metas = await fetchCatalog(id);
        return { metas };
    } catch (error) {
        console.error(`Catalog handler error for ${type}/${id}:`, error);
        return { metas: [] };
    }
});

function getInterface() {
    return builder.getInterface();
}

module.exports = { builder, getInterface };

if (require.main === module) {
    serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
}
