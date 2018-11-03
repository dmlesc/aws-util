'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

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
  if (err) { console.log(err, err.stack); }
  else {
    //console.log(data);
    console.log('# domains:', data.DomainNames.length);

    for (var i=0; i<data.DomainNames.length; i++) {
      var domain = data.DomainNames[i];
      
      //if (domain.search(/dev|test/gi) != -1) {
      //if (domain == 'domain_name') {
        //console.log(domain);
        domains.push(domain);
      //}
      

      //domains.push(domain);
    }
    //console.log(domains);
    getDomainMetadata(domains.shift());
  }
});

function getDomainMetadata(domain) {
  var params = {
    DomainName: domain
  };

  simpledb.domainMetadata(params, (err, data) => {
    if (err) { console.log(err, err.stack); }
    else {
      //console.log(data);
      console.log(domain);
      
      Object.keys(data).forEach( (key) => {
        //console.log(key);
        if (key != 'ResponseMetadata') {
          console.log('  ' + key + ' : ' + data[key]);
        }
      });
      
      if (domains.length) {
        getDomainMetadata(domains.shift());
      }
      else {
        console.log('done');
      }
    }
  });
}