// src/mdl.js
const axios = require('axios');
const { getCachedOrFetch } = require('./cache');
const { mapTitleToImdbId } = require('./cinemeta');

const KURYANA_BASE = 'https://kuryana.vercel.app/api/v1';

async function fetchFromMDL(endpoint) {
    const response = await axios.get(`${KURYANA_BASE}${endpoint}`, { timeout: 10000 });
    return response.data;
}

async function fetchCatalog(catalogId) {
    const cacheKey = `catalog:${catalogId}`;
    return getCachedOrFetch(cacheKey, 1000 * 60 * 60 * 6, async () => { // 6 hours
        let data = [];
        if (catalogId === 'kdrama_top') {
            data = await fetchFromMDL('/shows/top');
        } else if (catalogId === 'kdrama_trending') {
            data = await fetchFromMDL('/shows/popular');
        } else {
            throw new Error(`Unknown catalog ID: ${catalogId}`);
        }
        
        const items = Array.isArray(data) ? data : (data.results || data.data || []);
        
        const metas = [];
        for (const item of items) {
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
