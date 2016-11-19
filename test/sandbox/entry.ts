import express from 'express';
import https from 'https';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import fs from 'fs';
import nconf from 'nconf';

nconf.argv()
    .env()
    .file({ file: 'config.json' });

var options = {
    key: fs.readFileSync('test/assets/key.pem'),
    cert: fs.readFileSync('test/assets/cert.pem')
};

var app: any = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
// Enable development logging
app.use(morgan('dev'));

var port = 8080;
var router = express.Router();
var webhookCalls = {};

router.post('/webhook', function(req, res) {
    webhookCalls[req.body.event] = req.body;
    res.status(200).send({success: true});
});

router.get('/webhook/:event', function(req, res) {
    res.status(200).send(webhookCalls[req.params.event]);
});

app.use('/', router);

https.createServer(options, app).listen(port);
console.log(`Server listening on 0.0.0.0:${port}`);