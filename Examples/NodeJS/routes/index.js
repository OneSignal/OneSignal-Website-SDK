var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'OneSignal Example' });
});

router.get('/index2', function(req, res, next) {
  res.render('index', { title: 'OneSignal Example - Page 2' });
});

module.exports = router;
