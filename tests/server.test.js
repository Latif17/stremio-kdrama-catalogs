const request = require('supertest');
const { getInterface } = require('../src/server');

describe('Stremio Addon Server', () => {
    it('serves manifest.json', async () => {
        const addonInterface = getInterface();
        const { getRouter } = require('stremio-addon-sdk');
        const express = require('express');
        const app = express();
        app.use(getRouter(addonInterface));

        const res = await request(app).get('/manifest.json');
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe('org.kdramacatalog');
    });
});
