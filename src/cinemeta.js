const axios = require('axios');
const { getCachedOrFetch } = require('./cache');
const fs = require('fs');
const path = require('path');

let overrides = {};
try {
    overrides = JSON.parse(fs.readFileSync(path.join(__dirname, 'overrides.json'), 'utf8'));
} catch(e) {
    overrides = {};
}

async function searchCinemeta(query, type) {
    const url = `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(query)}.json`;
    const response = await axios.get(url, { timeout: 5000 });
    return response.data.metas || [];
}

async function mapTitleToImdbId(title, type, releaseYear) {
    const cacheKey = `cinemeta_v2:${type}:${title}:${releaseYear || 'any'}`;
    try {
        return await getCachedOrFetch(cacheKey, 1000 * 60 * 60 * 24 * 7, async () => { // cache mapping for 7 days
            const overrideId = overrides[title];
            if (overrideId) {
                try {
                    const metaUrl = `https://v3-cinemeta.strem.io/meta/${type}/${overrideId}.json`;
                    const metaRes = await axios.get(metaUrl, { timeout: 5000 });
                    if (metaRes.data && metaRes.data.meta) {
                        return metaRes.data.meta;
                    }
                } catch (e) {
                    // Ignore and fallback to search
                }
            }

            let metas = await searchCinemeta(title, type);
            
            // Automated fallback for localization and naming mismatches (e.g. "Season 2", colons)
            if (!metas.length) {
                // 1. Strip "Season X", "Part X", etc.
                let cleaned = title.replace(/\s*(Season|Part|Series|Chapter)\s*\d+/i, '').trim();
                
                // 2. If it's the same, try taking the main part before a colon or dash
                if (cleaned === title && (title.includes(':') || title.includes('-'))) {
                    cleaned = title.split(/[:\-]/)[0].trim();
                }

                if (cleaned && cleaned !== title) {
                    metas = await searchCinemeta(cleaned, type);
                }
            }

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
