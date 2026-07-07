const { getCachedOrFetch } = require('../src/cache');

describe('Cache Service', () => {
    it('fetches once and caches subsequent calls using default cache', async () => {
        let callCount = 0;
        const fetchFn = async () => { callCount++; return 'data'; };
        
        const res1 = await getCachedOrFetch('test-key-default', 1000, fetchFn);
        const res2 = await getCachedOrFetch('test-key-default', 1000, fetchFn);
        
        expect(res1).toBe('data');
        expect(res2).toBe('data');
        expect(callCount).toBe(1);
    });

    describe('with shared cache instance', () => {
        it('handles concurrent calls without cache stampede', async () => {
            let callCount = 0;
            const fetchFn = async () => {
                callCount++;
                return new Promise(resolve => setTimeout(() => resolve('concurrent'), 50));
            };

            const [res1, res2, res3] = await Promise.all([
                getCachedOrFetch('test-key-concurrent', 1000, fetchFn),
                getCachedOrFetch('test-key-concurrent', 1000, fetchFn),
                getCachedOrFetch('test-key-concurrent', 1000, fetchFn)
            ]);

            expect(res1).toBe('concurrent');
            expect(res2).toBe('concurrent');
            expect(res3).toBe('concurrent');
            expect(callCount).toBe(1);
        });

        it('removes rejected promises from cache so they can be retried', async () => {
            let callCount = 0;
            const fetchFn = async () => {
                callCount++;
                if (callCount === 1) throw new Error('fail');
                return 'success';
            };

            await expect(getCachedOrFetch('test-key-error', 1000, fetchFn)).rejects.toThrow('fail');

            const res = await getCachedOrFetch('test-key-error', 1000, fetchFn);
            expect(res).toBe('success');
            expect(callCount).toBe(2);
        });

        it('expires items after TTL', async () => {
            let callCount = 0;
            const fetchFn = async () => { callCount++; return 'ttl-data'; };
            
            await getCachedOrFetch('test-key-ttl', 100, fetchFn);
            expect(callCount).toBe(1);

            // Wait 120ms to ensure TTL expires
            await new Promise(resolve => setTimeout(resolve, 120));

            await getCachedOrFetch('test-key-ttl', 100, fetchFn);
            expect(callCount).toBe(2);
        });
        
        it('handles synchronous fetchFn correctly', async () => {
            let callCount = 0;
            const fetchFn = () => { callCount++; return 'sync-data'; };
            
            const res1 = await getCachedOrFetch('test-key-sync', 1000, fetchFn);
            const res2 = await getCachedOrFetch('test-key-sync', 1000, fetchFn);
            
            expect(res1).toBe('sync-data');
            expect(res2).toBe('sync-data');
            expect(callCount).toBe(1);
        });
    });
});
