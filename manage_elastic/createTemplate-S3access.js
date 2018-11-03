'use strict';

const env = process.argv[2];
const conf = require('../conf/' + env);

const elasticsearch = require('elasticsearch');
const elastic = new elasticsearch.Client({
  host: conf.elasticsearch_host
  //, log: 'trace'
});

var params = {
  name: 'bbb',
  //timeout: '10m',
  body: {
    template: 'bbb-*',
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0
    },
    mappings: {
      doc: {
        properties: {
          timestamp: { type: 'date', format: 'strict_date_optional_time' },
          bucket : { type : 'keyword' },
          remote_ip : { type : 'keyword' },
          operation : { type : 'keyword' },
          key : { type : 'keyword' },
          http_status: { type : 'keyword' },
          error_code: { type: 'keyword' },
          bytes_sent: { type : 'integer' },
          object_size: { type: 'integer' },
          total_time: { type: 'integer' },
          turn_around_time: { type: 'integer' },
          referrer: { type: 'keyword' },
          user_agent: { type: 'text' },
        }
      }
    }
  }
};


elastic.indices.putTemplate(params, (err, res) => {
  if (err)
    console.log(err);
  else
    console.log(res);
});

process.on('uncaughtException', (err) => {
  console.log(err);
});