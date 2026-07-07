const request = require('supertest');
const app = require('../src/server');

describe('Configuration Route', () => {
    it('should serve configure.html on /configure', async () => {
        const response = await request(app).get('/configure');
        expect(response.status).toBe(200);
        expect(response.text).toContain('KDrama Catalog Configuration');
    });

    it('should redirect / to /configure', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/configure');
    });
});
