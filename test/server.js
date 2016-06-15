import express from 'express';
import https from 'https';
import cors from 'cors';
import bodyParser from 'body-parser';
import database from './server/database';
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

var port = 8080;
var router = express.Router();

router.delete('/player/:id', function(req, res) {
    console.log(req.params);
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

app.use('/', router);

https.createServer(options, app).listen(port);
console.log(`Server listening on 0.0.0.0:${port}`);