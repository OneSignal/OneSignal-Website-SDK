import express from 'express';
import https from 'https';
import cors from 'cors';
import bodyParser from 'body-parser';
import database from './server/database';
import morgan from 'morgan';
import fs from 'fs';
import Sequelize from 'sequelize';

var options = {
    key: fs.readFileSync('test/server/key.pem'),
    cert: fs.readFileSync('test/server/cert.pem')
};

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
// Enable development logging
app.use(morgan('dev'));

var port = 8080;
var router = express.Router();
var webhookCalls = {};

router.delete('/player/:id', function(req, res) {
    database.query(
        'DELETE FROM players WHERE id = :id ',
        {
            replacements: {
                id: req.params.id
            }
        }
    ).then((results, metadata) => {
            let rowsAffected = results[1]['rowCount'];

            if (rowsAffected == 1) {
                res.status(200).send({
                    message: 'Player deleted successfully.'
                });
            } else {
                res.status(404).send({
                    message: 'User with ID not found.'
                });
            }
        })
        .catch(e => {
            res.status(500).send({
                message: e
            })
        });
});

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