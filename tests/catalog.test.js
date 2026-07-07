const request = require('supertest');
const app = require('../src/server');

// Mock mdl.js
jest.mock('../src/mdl', () => ({
    fetchCatalog: jest.fn().mockResolvedValue([{ id: 'test1', type: 'series', name: 'Test Drama' }])
}));

describe('Catalog Routes', () => {
    it('should return metas for selected catalog', async () => {
        const choices = JSON.stringify({ kdrama_trending: "on" });
        const response = await request(app).get(`/${encodeURIComponent(choices)}/catalog/series/kdrama_trending.json`);
        expect(response.status).toBe(200);
        expect(response.body.metas.length).toBe(1);
        expect(response.body.metas[0].name).toBe('Test Drama');
    });
});
