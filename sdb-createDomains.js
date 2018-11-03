'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const fs = require('fs');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const credentials = new AWS.SharedIniFileCredentials({profile: process.argv[2]});
AWS.config.credentials = credentials;
const simpledb = new AWS.SimpleDB({apiVersion: '2009-04-15'});

var domains_created = 0;

var domains = [ 
  'list',
  'of',
  'domains',
  'to',
  'create'
];

function createDomain(domain) {
  var params = {
    DomainName: domain
  };
  
  simpledb.createDomain(params, (err, data) => {
    if (err) { console.log(err, err.stack); }
    else {
      //console.log(data);
      console.log('created domain:', domain);
      domains_created++;

      if (domains.length) {
        createDomain(domains.shift());
      }
      else {
        console.log('done');
        console.log('domains_created:', domains_created);
      }
    }
  });
}

createDomain(domains.shift());