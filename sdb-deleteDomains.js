'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const fs = require('fs');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const credentials = new AWS.SharedIniFileCredentials({profile: process.argv[2]});
AWS.config.credentials = credentials;
const simpledb = new AWS.SimpleDB({apiVersion: '2009-04-15'});

var domains = [];

var params = {
  MaxNumberOfDomains: 100
  //, NextToken: 'STRING_VALUE'
};

simpledb.listDomains(params, (err, data) => {
  if (err) { log([err, err.stack]); }
  else {
    //console.log(data);
    //console.log('# domains:', data.DomainNames.length);

    for (var i=0; i<data.DomainNames.length; i++) {
      var domain = data.DomainNames[i];

      //if (domain.search(/dev|test/gi) != -1) {
      //if (domain == 'domain_name') {
        //console.log(domain);
        domains.push(domain);
      //}
    }

    deleteDomain(domains.shift());
  }
});

function deleteDomain(domain) {

  var params = {
    DomainName: domain
  };

  simpledb.deleteDomain(params, (err, data) => {
    if (err) { console.log(err, err.stack); }
    else {
      //console.log(data);

      console.log('deleted:', domain);

      if (domains.length) {
        deleteDomain(domains.shift());
      }
      else {
        console.log('done');
      }
    }
  });
}