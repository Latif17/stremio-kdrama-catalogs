// src/mdl.js
const axios = require('axios');
const cheerio = require('cheerio');
const { getCachedOrFetch } = require('./cache');
const { mapTitleToImdbId } = require('./cinemeta');

const GENRES = {
    'Action': 1,
    'Adventure': 5,
    'Comedy': 17,
    'Crime': 21,
    'Drama': 25,
    'Fantasy': 32,
    'Historical': 10,
    'Horror': 14,
    'Mystery': 11,
    'Romance': 19,
    'Sci-fi': 27,
    'Thriller': 8
};

async function fetchFromMDL(typeId, sort, genreName, status) {
    const items = [];
    for (let page = 1; page <= 5; page++) {
        let url = `https://mydramalist.com/search?adv=titles&ty=${typeId}&co=3&so=${sort}&page=${page}`;
        if (genreName && GENRES[genreName]) url += `&ge=${GENRES[genreName]}`;
        if (status) url += `&st=${status}`;

        try {
            const response = await axios.get(url, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
                timeout: 10000 
            });
            const $ = cheerio.load(response.data);
            $('.box[id^="mdl-"]').each((i, el) => {
                const title = $(el).find('h6.title a').text().trim();
                const yearMatch = $(el).find('span.text-muted').text().match(/\b(19|20)\d{2}\b/);
                const year = yearMatch ? yearMatch[0] : '';
                let img = $(el).find('img.img-responsive').attr('data-src') || $(el).find('img.img-responsive').attr('src');
                if (img && img.includes('?')) img = img.split('?')[0];
                if (title) items.push({ title, year, poster: img });
            });
        } catch (e) {
            // Ignore single page errors to allow remaining pages to load
        }
    }
    return items;
}

async function fetchCatalog(catalogId, extra, skip = 0) {
    const genre = extra && extra.genre ? extra.genre : null;
    const cacheKey = `catalog:${catalogId}:${genre || 'all'}`;
    
    const cachedMetas = await getCachedOrFetch(cacheKey, 1000 * 60 * 60 * 6, async () => { 
        let typeId = 68; // series
        let metaType = 'series';
        let sort = 'popular';
        let status = null;
        
        if (catalogId.includes('movie')) { typeId = 77; metaType = 'movie'; }
        if (catalogId.includes('top')) sort = 'top';
        if (catalogId.includes('airing')) { sort = 'top'; status = 3; }
        
        const items = await fetchFromMDL(typeId, sort, genre, status);
        
        const metas = [];
        const concurrencyLimit = 20; // Increased for faster cold boots
        for (let i = 0; i < items.length; i += concurrencyLimit) {
            const chunk = items.slice(i, i + concurrencyLimit);
            const chunkPromises = chunk.map(async (item) => {
                const imdbId = await mapTitleToImdbId(item.title, metaType, item.year);
                if (imdbId) {
                    return { id: imdbId, type: metaType, name: item.title, poster: item.poster };
                }
                return null;
            });
            const results = await Promise.all(chunkPromises);
            for (const res of results) if (res) metas.push(res);
        }
        return metas;
    });

    return cachedMetas.slice(skip, skip + 20);
}

module.exports = { fetchCatalog };
