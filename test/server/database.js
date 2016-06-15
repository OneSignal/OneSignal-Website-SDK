import Sequelize from 'sequelize';

var user = 'postgres';
var pass = '';
var host = 'localhost';
var database = new Sequelize(`postgres://${user}:${pass}@${host}:5432/gamethrive`);

export default database;