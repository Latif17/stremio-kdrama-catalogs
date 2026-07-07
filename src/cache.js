const { LRUCache } = require('lru-cache');

const cache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 60, // 1 hour default
});

async function getCachedOrFetch(key, ttlMs, fetchFn) {
    if (cache.has(key)) {
        return cache.get(key);
    }
    const data = await fetchFn();
    cache.set(key, data, { ttl: ttlMs });
    return data;
}

module.exports = { getCachedOrFetch };
