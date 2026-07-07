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
