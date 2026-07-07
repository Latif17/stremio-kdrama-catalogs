const nock = require('nock');
const { mapTitleToImdbId } = require('../src/cinemeta');

describe('Cinemeta ID Mapper', () => {
    afterEach(() => nock.cleanAll());

    it('maps title to imdb id correctly', async () => {
        nock('https://v3-cinemeta.strem.io')
            .get('/catalog/series/top/search=Squid%20Game.json')
            .reply(200, {
                metas: [
                    { name: 'Squid Game', imdb_id: 'tt10919420', releaseInfo: '2021-' }
                ]
            });
        
        const id = await mapTitleToImdbId('Squid Game', 'series', 2021);
        expect(id).toBe('tt10919420');
    });
    
    it('returns null if no exact year match', async () => {
        nock('https://v3-cinemeta.strem.io')
            .get('/catalog/series/top/search=Fake%20Show.json')
            .reply(200, {
                metas: [
                    { name: 'Fake Show', imdb_id: 'tt99999', releaseInfo: '2015-' }
                ]
            });
        
        const id = await mapTitleToImdbId('Fake Show', 'series', 2020);
        expect(id).toBe(null);
    });

    it('returns first result if no releaseYear provided', async () => {
        nock('https://v3-cinemeta.strem.io')
            .get('/catalog/series/top/search=No%20Year%20Show.json')
            .reply(200, {
                metas: [
                    { name: 'No Year Show', imdb_id: 'tt88888', releaseInfo: '2015-' }
                ]
            });
        
        const id = await mapTitleToImdbId('No Year Show', 'series');
        expect(id).toBe('tt88888');
    });

    it('throws on network failure', async () => {
        nock('https://v3-cinemeta.strem.io')
            .get('/catalog/series/top/search=Error%20Show.json')
            .replyWithError('Network error');
            
        await expect(mapTitleToImdbId('Error Show', 'series', 2020)).rejects.toThrow();
    });
});
