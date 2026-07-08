const axios = require('axios');
const { getCachedOrFetch } = require('./cache');

async function searchCinemeta(query, type) {
    const url = `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(query)}.json`;
    const response = await axios.get(url, { timeout: 5000 });
    return response.data.metas || [];
}

async function mapTitleToImdbId(title, type, releaseYear) {
    const cacheKey = `cinemeta_v2:${type}:${title}:${releaseYear || 'any'}`;
    try {
        return await getCachedOrFetch(cacheKey, 1000 * 60 * 60 * 24 * 7, async () => { // cache mapping for 7 days
            const metas = await searchCinemeta(title, type);
            if (!metas.length) return null;
            
            let match;
            if (!releaseYear) {
                match = metas[0];
            } else {
                match = metas.find(m => {
                    const year = m.year || (m.releaseInfo && m.releaseInfo.substring(0,4));
                    return String(year) === String(releaseYear);
                });
                if (!match) match = metas[0];
            }
            
            if (!match) return null;
            
            try {
                const metaUrl = `https://v3-cinemeta.strem.io/meta/${type}/${match.imdb_id || match.id}.json`;
                const metaRes = await axios.get(metaUrl, { timeout: 5000 });
                if (metaRes.data && metaRes.data.meta) {
                    return metaRes.data.meta;
                }
            } catch (e) {
                // Ignore and return match fallback
            }
            
            return match;
        });
    } catch (e) {
        return null;
    }
}

module.exports = { mapTitleToImdbId };
