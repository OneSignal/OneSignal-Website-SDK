const path = require('path');
const express = require('express');
const https = require('https');
const fs = require('fs');
var sanitize = require("sanitize-filename");

const app = express(),
            DIST_DIR = __dirname,
            HTML_FILE = path.join(DIST_DIR, 'index.html'),
            SDK_FILES = path.join(DIST_DIR, '../build/releases/');

var RateLimit = require('express-rate-limit');
var limiter = RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per windowMs
});
// apply rate limiter to all requests
app.use(limiter);

const options = {
    key: fs.readFileSync('certs/dev-ssl.key'),
    cert: fs.readFileSync('certs/dev-ssl.crt')
}

app.get('/', (req, res) => {
    res.sendFile(HTML_FILE);
})

app.get('/sdks/web/v16/:file', (req, res) => {
    res.sendFile(SDK_FILES + sanitize(req.params.file));
});

app.get('/:file', (req, res) => {
    res.sendFile(sanitize(req.params.file));
});

https.createServer(options, app).listen(4001, () => console.log("express_webpack: listening on port 4001 (https)"));

// http
app.listen(4000, () => console.log('express_webpack: listening on port 4000 (http)'));
