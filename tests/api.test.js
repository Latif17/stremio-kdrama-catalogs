const request = require('supertest');
const app = require('../api/index.js');

describe('API Entry Point', () => {
    it('should initialize express app', async () => {
        expect(app).toBeDefined();
        expect(typeof app.use).toBe('function');
    });
});
