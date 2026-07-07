const nock = require('nock');
const { mapTitleToImdbId } = require('../src/cinemeta');

describe('Cinemeta ID Mapper', () => {
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
});
