'use strict';

const env = process.argv[2];
const conf = require('../conf/' + env);

var date = process.argv[3];

const elasticsearch = require('elasticsearch');
const elastic = new elasticsearch.Client({
  host: conf.elasticsearch_host
  //, log: 'trace'
});

//var indices = ['dw-*', 'ttm-*', 'lt-*', 'fms-*'];
/*
var indices = [
  'dw-staging-2016-09-27',
  'dw-production-2016-09-27',
  'login-production-2016-09-27',
  'lt-rc-2016-09-27',
  'ttm-rc-2016-09-27',
  'ttm-production-2016-09-27',
  'login-rc-2016-09-27',
  'lt-production-2016-09-27',
  'fms-2016-09-27'
];
*/

//var indices = ['*-2016-12-*'];
var indices = ['portal-2018.02.21'];

elastic.indices.delete({ index: indices }, (err, res) => {
  if (err)
    console.log(err);
  else {
    console.log(res);
  }
});

process.on('uncaughtException', (err) => {
  console.log(err);
});