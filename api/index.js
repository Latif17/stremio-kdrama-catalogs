const { getRouter } = require('stremio-addon-sdk');
const { getInterface } = require('../src/server');
const express = require('express');

const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

const addonInterface = getInterface();
app.use(getRouter(addonInterface));

module.exports = app;
