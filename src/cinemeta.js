const axios = require('axios');
const { getCachedOrFetch } = require('./cache');

async function searchCinemeta(query, type) {
    const url = `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(query)}.json`;
    const response = await axios.get(url, { timeout: 5000 });
    return response.data.metas || [];
}

async function mapTitleToImdbId(title, type, releaseYear) {
    const cacheKey = `cinemeta:${type}:${title}:${releaseYear}`;
    return getCachedOrFetch(cacheKey, 1000 * 60 * 60 * 24 * 7, async () => { // cache mapping for 7 days
        const metas = await searchCinemeta(title, type);
        if (!metas.length) return null;
        if (!releaseYear) return metas[0]?.imdb_id || null;
        
        const match = metas.find(m => {
            const year = m.year || (m.releaseInfo && m.releaseInfo.substring(0,4));
            return year === String(releaseYear);
        });
        
        return match ? match.imdb_id : null;
    });
}

module.exports = { mapTitleToImdbId };
