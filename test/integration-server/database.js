import Sequelize from 'sequelize';

var user = 'postgres';
var pass = '';
var host = 'localhost';
export var database = new Sequelize(`postgres://${user}:${pass}@${host}:5432/onesignal_00`);
export var databaseShard = new Sequelize(`postgres://${user}:${pass}@${host}:5432/onesignal_80`);