const request = require('supertest');
const app = require('../src/server');

describe('Meta Proxy Route', () => {
    it('should redirect k drama meta requests to Cinemeta series endpoint', async () => {
        const response = await request(app).get('/%7B%7D/meta/k%20drama/tt1234567.json');
        
        expect(response.status).toBe(307);
        // "k drama" should map to "series" or "movie" in Cinemeta. 
        // We will default to "series" as it's the most common for KDrama.
        expect(response.headers.location).toBe('https://v3-cinemeta.strem.io/meta/series/tt1234567.json');
    });

    it('should redirect series meta requests to Cinemeta directly', async () => {
        const response = await request(app).get('/%7B%7D/meta/series/tt1234567.json');
        
        expect(response.status).toBe(307);
        expect(response.headers.location).toBe('https://v3-cinemeta.strem.io/meta/series/tt1234567.json');
    });

    it('should redirect unparameterized k drama meta requests to Cinemeta series endpoint', async () => {
        const response = await request(app).get('/meta/k%20drama/tt1234567.json');
        
        expect(response.status).toBe(307);
        expect(response.headers.location).toBe('https://v3-cinemeta.strem.io/meta/series/tt1234567.json');
    });

    it('should redirect unparameterized series meta requests to Cinemeta directly', async () => {
        const response = await request(app).get('/meta/series/tt1234567.json');
        
        expect(response.status).toBe(307);
        expect(response.headers.location).toBe('https://v3-cinemeta.strem.io/meta/series/tt1234567.json');
    });
});
