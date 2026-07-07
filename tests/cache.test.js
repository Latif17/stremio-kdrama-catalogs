const { getCachedOrFetch } = require('../src/cache');

describe('Cache Service', () => {
    it('fetches once and caches subsequent calls', async () => {
        let callCount = 0;
        const fetchFn = async () => { callCount++; return 'data'; };
        
        const res1 = await getCachedOrFetch('test-key', 1000, fetchFn);
        const res2 = await getCachedOrFetch('test-key', 1000, fetchFn);
        
        expect(res1).toBe('data');
        expect(res2).toBe('data');
        expect(callCount).toBe(1);
    });
});
