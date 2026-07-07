const express = require('express');
const path = require('path');
const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

app.get('/', (req, res) => {
    res.redirect('/configure');
});

app.get('/configure', (req, res) => {
    res.sendFile(path.join(__dirname, 'configure.html'));
});

module.exports = app;

if (require.main === module) {
    app.listen(process.env.PORT || 7000, () => {
        console.log('Listening on port ' + (process.env.PORT || 7000));
    });
}
