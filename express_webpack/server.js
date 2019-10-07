const path = require('path');
const express = require('express');
const app = express(),
            DIST_DIR = __dirname,
            HTML_FILE = path.join(DIST_DIR, 'index.html'),
            SDK_FILES = path.join(DIST_DIR, '../build/releases/')
app.use(express.static(DIST_DIR))
app.get('/', (req, res) => {
    res.sendFile(HTML_FILE);
})

app.get('/sdks/:file', (req, res) => {
    res.sendFile(SDK_FILES+req.params.file);
});

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`App listening to ${PORT}....`)
    console.log('Press Ctrl+C to quit.')
})
