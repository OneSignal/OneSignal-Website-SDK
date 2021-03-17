const path = require('path');
const express = require('express');
const https = require('https');
const fs = require('fs');
const app = express(),
            DIST_DIR = __dirname,
            HTML_FILE = path.join(DIST_DIR, 'index.html'),
            SDK_FILES = path.join(DIST_DIR, '../build/releases/');
const options = {
    key: fs.readFileSync('certs/dev-ssl.key'),
    cert: fs.readFileSync('certs/dev-ssl.crt')
}

app.use(express.static(DIST_DIR))
app.get('/', (req, res) => {
    res.sendFile(HTML_FILE);
})

app.get('/sdks/:file', (req, res) => {
    res.sendFile(SDK_FILES + req.params.file);
});

app.get('/:file', (req, res) => {
    res.sendFile(req.params.file);
});

https.createServer(options, app).listen(4001, () => console.log("express_webpack: listening on port 4001 (https)"));

// http
app.listen(4000, () => console.log('express_webpack: listening on port 4000 (http)'));
