const request = require('supertest');
const { getInterface } = require('../src/server');

jest.mock('../src/mdl', () => ({
    fetchCatalog: jest.fn().mockResolvedValue([{ id: 'tt123', type: 'series', name: 'Mock' }])
}));

describe('Stremio Addon Server', () => {
    let app;

    beforeEach(() => {
        const addonInterface = getInterface();
        const { getRouter } = require('stremio-addon-sdk');
        const express = require('express');
        app = express();
        app.use(getRouter(addonInterface));
    });

    it('serves manifest.json', async () => {
        const res = await request(app).get('/manifest.json');
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe('org.kdramacatalog');
    });

    it('handles catalog requests', async () => {
        const res = await request(app).get('/catalog/series/kdrama_trending.json');
        expect(res.statusCode).toBe(200);
        expect(res.body.metas[0].id).toBe('tt123');
    });
});
