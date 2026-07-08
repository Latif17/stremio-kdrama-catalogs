const request = require('supertest');
const app = require('../src/server');

describe('Server Routes', () => {
    it('responds to Top Airing K-Dramas manifest', async () => {
        const res = await request(app).get('/%7B%22kdrama_airing_series%22:%22on%22%7D/manifest.json');
        expect(res.statusCode).toBe(200);
        expect(res.body.catalogs.some(c => c.id === 'kdrama_airing_series')).toBeTruthy();
    });
});
