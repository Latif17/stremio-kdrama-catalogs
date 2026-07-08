const request = require('supertest');
const app = require('../src/server');

// Mock mdl.js
jest.mock('../src/mdl', () => ({
    fetchCatalog: jest.fn().mockImplementation(async () => [
        { id: 'tt12345', type: 'series', name: 'Test Drama', poster: 'original-poster.jpg' },
        { id: 'other123', type: 'series', name: 'Other Drama', poster: 'other-poster.jpg' }
    ])
}));

describe('Catalog Routes', () => {
    it('should return metas for selected catalog and preserve original poster without rpdbkey', async () => {
        const choices = JSON.stringify({ kdrama_trending: "on" });
        const response = await request(app).get(`/${encodeURIComponent(choices)}/catalog/series/kdrama_trending.json`);
        expect(response.status).toBe(200);
        expect(response.body.metas.length).toBe(2);
        expect(response.body.metas[0].name).toBe('Test Drama');
        expect(response.body.metas[0].poster).toBe('original-poster.jpg');
    });
});

describe('Catalog Routes with RPDB and Headers', () => {
    it('should inject RPDB poster when rpdbkey is provided and include Cache-Control header', async () => {
        const choices = JSON.stringify({ kdrama_trending: "on", rpdbkey: "test-key" });
        const response = await request(app).get(`/${encodeURIComponent(choices)}/catalog/series/kdrama_trending.json`);
        
        expect(response.status).toBe(200);
        expect(response.body.metas.length).toBe(2);
        expect(response.body.metas[0].poster).toBe('https://api.ratingposterdb.com/test-key/imdb/poster-default/tt12345.jpg?fallback=true');
        
        // Assert items without 'tt' ID fallback gracefully
        expect(response.body.metas[1].poster).toBe('other-poster.jpg');
        
        // Assert Cache-Control
        expect(response.headers['cache-control']).toBe('public, max-age=14400, stale-while-revalidate=86400, stale-if-error=86400');
    });
});
