var express = require('express');
var router = express.Router();
var url = require('url');
var http = require('http');
var validator = require('validator');

/* GET home page. */
router.get('/', function(req, res) {
  var data;

  if (validator.isURL(req.query.url)) {
    try {
      http.get(req.query.url, function (r) {
        r.on('data', function (chunk) {
          data = data ? data + chunk : chunk;
        }).on('end', function () {
          res.setHeader('Content-Type', r.headers['content-type']);
          res.setHeader('Content-Lenght', r.headers['content-length'])
          res.statusCode = r.statusCode;
          res.write(data);
          res.end();
        }).on('error', function (err) {
          console.error(err);
          res.send(502);
        });
      });
    } catch (err) {
      console.error(err.stack);
      res.send(500);
    }
  } else {
    res.send(400, 'invalide URL, check querystring: /proxy?url=some-valid-url');
  }
});

module.exports = router;
