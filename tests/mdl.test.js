// tests/mdl.test.js
const nock = require('nock');
const { fetchCatalog } = require('../src/mdl');

// Mock cinemeta mapping
jest.mock('../src/cinemeta', () => ({
    mapTitleToImdbId: jest.fn().mockResolvedValue('tt12345')
}));

describe('MDL Catalog Fetcher', () => {
    afterEach(() => nock.cleanAll());

    it('fetches trending list and maps to Stremio metas', async () => {
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
});
