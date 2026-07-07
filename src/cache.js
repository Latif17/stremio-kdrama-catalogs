const { LRUCache } = require('lru-cache');

const cache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 60, // 1 hour default
});

async function getCachedOrFetch(key, ttlMs, fetchFn) {
    if (cache.has(key)) {
        return cache.get(key);
    }

    const promise = Promise.resolve(fetchFn()).catch(err => {
        cache.delete(key);
        throw err;
    });

    cache.set(key, promise, { ttl: ttlMs });
    return promise;
}

module.exports = {
    getCachedOrFetch
};
