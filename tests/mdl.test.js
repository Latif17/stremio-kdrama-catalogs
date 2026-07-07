// tests/mdl.test.js
const nock = require('nock');
const { fetchCatalog } = require('../src/mdl');

// Mock cinemeta mapping
jest.mock('../src/cinemeta', () => ({
    mapTitleToImdbId: jest.fn().mockResolvedValue('tt12345')
}));

jest.mock('../src/cache', () => ({
    getCachedOrFetch: jest.fn((key, ttl, fetchFn) => fetchFn())
}));

const { mapTitleToImdbId } = require('../src/cinemeta');

describe('MDL Catalog Fetcher', () => {
    afterEach(() => {
        nock.cleanAll();
        jest.clearAllMocks();
    });

    it('fetches trending list and maps to Stremio metas', async () => {
        mapTitleToImdbId.mockResolvedValue('tt12345');
        nock('https://kuryana.vercel.app')
            .get('/api/v1/shows/top')
            .reply(200, [
                { title: 'Test Drama', year: 2023, poster: 'http://img.com/a.jpg' }
            ]);
        
        const metas = await fetchCatalog('kdrama_top');
        expect(metas).toHaveLength(1);
        expect(metas[0].id).toBe('tt12345');
        expect(metas[0].name).toBe('Test Drama');
    });

    it('ignores items with missing titles', async () => {
        mapTitleToImdbId.mockResolvedValue('tt12345');
        nock('https://kuryana.vercel.app')
            .get('/api/v1/shows/popular')
            .reply(200, [
                { year: 2023, poster: 'http://img.com/b.jpg' },
                { title: 'Valid Drama', year: 2023, poster: 'http://img.com/a.jpg' }
            ]);
        
        const metas = await fetchCatalog('kdrama_trending');
        expect(metas).toHaveLength(1);
        expect(metas[0].name).toBe('Valid Drama');
    });

    it('ignores items where Cinemeta ID mapping fails', async () => {
        mapTitleToImdbId.mockResolvedValueOnce(null).mockResolvedValueOnce('tt12345');
        nock('https://kuryana.vercel.app')
            .get('/api/v1/shows/top')
            .reply(200, [
                { title: 'Failing Drama', year: 2023, poster: 'http://img.com/c.jpg' },
                { title: 'Success Drama', year: 2023, poster: 'http://img.com/a.jpg' }
            ]);
        
        const metas = await fetchCatalog('kdrama_top');
        expect(metas).toHaveLength(1);
        expect(metas[0].name).toBe('Success Drama');
    });

    it('throws error for unknown catalog IDs', async () => {
        await expect(fetchCatalog('unknown_catalog')).rejects.toThrow('Unknown catalog ID: unknown_catalog');
    });

    it('throws error on API failure', async () => {
        nock('https://kuryana.vercel.app')
            .get('/api/v1/shows/top')
            .reply(500, 'Internal Server Error');
        
        await expect(fetchCatalog('kdrama_top')).rejects.toThrow();
    });
});
