'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const credentials = new AWS.SharedIniFileCredentials({profile: process.argv[2]});
AWS.config.credentials = credentials;
const simpledb = new AWS.SimpleDB({apiVersion: '2009-04-15'});

var params = {
  DomainName: 'domain_name',
  ItemName: 'item_name',
  Attributes: [
    {
      Name: 'attr_name'
    },
  ]
};

simpledb.deleteAttributes(params, (err, data) => {
  if (err) { console.log(err, err.stack); }
  else {
    console.log(data);
  }
});