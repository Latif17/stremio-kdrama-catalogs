const request = require('supertest');
const app = require('../src/server');

describe('Manifest Routes', () => {
    it('should return base configurable manifest', async () => {
        const response = await request(app).get('/manifest.json');
        expect(response.status).toBe(200);
        expect(response.body.behaviorHints.configurable).toBe(true);
        expect(response.body.catalogs.length).toBe(0);
    });

    it('should return dynamic manifest based on choices', async () => {
        const choices = JSON.stringify({ kdrama_trending: "on" });
        const response = await request(app).get(`/${encodeURIComponent(choices)}/manifest.json`);
        expect(response.status).toBe(200);
        expect(response.body.catalogs.length).toBe(2);
        expect(response.body.catalogs[0].id).toBe('kdrama_trending_series');
        expect(response.body.catalogs[1].id).toBe('kdrama_trending_movie');
        expect(response.body.behaviorHints).toBeUndefined();
    });
});
