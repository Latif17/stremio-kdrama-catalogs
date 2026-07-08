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
        nock('https://mydramalist.com')
            .get('/search')
            .query(true) // match any query for simplicity
            .reply(200, '<div class="box" id="mdl-1"><h6 class="title"><a href="#">Test Drama</a></h6><span class="text-muted">2023</span><img class="img-responsive" data-src="http://img.com/a.jpg"></div>');
        
        const metas = await fetchCatalog('kdrama_top');
        expect(metas).toHaveLength(1);
        expect(metas[0].id).toBe('tt12345');
        expect(metas[0].name).toBe('Test Drama');
    });

    it('ignores items with missing titles', async () => {
        mapTitleToImdbId.mockResolvedValue('tt12345');
        nock('https://mydramalist.com')
            .get('/search')
            .query(true)
            .reply(200, `
                <div class="box" id="mdl-1"><span class="text-muted">2023</span><img class="img-responsive" data-src="http://img.com/b.jpg"></div>
                <div class="box" id="mdl-2"><h6 class="title"><a href="#">Valid Drama</a></h6><span class="text-muted">2023</span><img class="img-responsive" data-src="http://img.com/a.jpg"></div>
            `);
        
        const metas = await fetchCatalog('kdrama_trending');
        expect(metas).toHaveLength(1);
        expect(metas[0].name).toBe('Valid Drama');
    });

    it('ignores items where Cinemeta ID mapping fails', async () => {
        mapTitleToImdbId.mockResolvedValueOnce(null).mockResolvedValueOnce('tt12345');
        nock('https://mydramalist.com')
            .get('/search')
            .query(true)
            .reply(200, `
                <div class="box" id="mdl-1"><h6 class="title"><a href="#">Failing Drama</a></h6><span class="text-muted">2023</span></div>
                <div class="box" id="mdl-2"><h6 class="title"><a href="#">Success Drama</a></h6><span class="text-muted">2023</span></div>
            `);
        
        const metas = await fetchCatalog('kdrama_top');
        expect(metas).toHaveLength(1);
        expect(metas[0].name).toBe('Success Drama');
    });

    it('throws error on API failure', async () => {
        nock('https://mydramalist.com')
            .get('/search')
            .query(true)
            .reply(500, 'Internal Server Error');
        
        await expect(fetchCatalog('kdrama_top')).rejects.toThrow();
    });
});
