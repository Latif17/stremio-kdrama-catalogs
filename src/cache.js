const { LRUCache } = require('lru-cache');

function createCache(options = {}) {
    const cache = new LRUCache({
        max: options.max || 500,
        ttl: options.ttl || 1000 * 60 * 60, // 1 hour default
    });

    async function getCachedOrFetch(key, ttlMs, fetchFn) {
        if (cache.has(key)) {
            return cache.get(key);
        }

        const promise = fetchFn().catch(err => {
            cache.delete(key);
            throw err;
        });

        cache.set(key, promise, { ttl: ttlMs });
        return promise;
    }

    return { getCachedOrFetch, cache };
}

const defaultCache = createCache();

module.exports = {
    getCachedOrFetch: defaultCache.getCachedOrFetch,
    createCache
};
