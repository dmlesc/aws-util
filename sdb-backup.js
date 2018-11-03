'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const fs = require('fs');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const credentials = new AWS.SharedIniFileCredentials({profile: process.argv[2]});
AWS.config.credentials = credentials;
const simpledb = new AWS.SimpleDB({apiVersion: '2009-04-15'});

const domainOverride = process.argv[3];

var domains = [];
var totalItems = 0;
//var backup_buckets = ['./backup1/'];
var backup_buckets = ['./backup0/', './backup1/', './backup2/', './backup3/'];
var bucindex = 0;
const itemLimit = 5000;
const wait = 1000; // ms
var items = [];

var params = {
  MaxNumberOfDomains: 100
  //, NextToken: 'STRING_VALUE'
};

simpledb.listDomains(params, (err, data) => {
  if (err) { log([err, err.stack]); }
  else {
    //console.log(data);

    if (domainOverride) {
      log(['domainOverride', domainOverride]);
      domains.push(domainOverride);
    }
    else {
      for (var i=0; i<data.DomainNames.length; i++) {
        var domain = data.DomainNames[i];
  
        //if (domain.search(/dev|test/gi) != -1) {
        //if (domain == 'Game_Index') {
          log([domain]);
          domains.push(domain);
        //}
      }
    }

    getDomainItems(domains.shift());
  }
});

function getDomainItems(domain, token) {
  var query = 'select * from ' + domain + ' limit 2000';

  var params = {
    SelectExpression: query,
    ConsistentRead: true,
    NextToken: token
  };

  simpledb.select(params, (err, data) => {
    if (err) { log([err, err.stack]); }
    else {
      //console.log(data);

      if (data.Items) {
        items = items.concat(data.Items);
        totalItems += data.Items.length;
      }

      log(['domain:' + domain, 'items:' + items.length, 'totalItems:' + totalItems]);

      if (data.NextToken) {
        if (items.length >= itemLimit) {
          log(['itemLimit reached']);
          saveItems(domain);
        }
  
        setTimeout(getDomainItems, wait, domain, data.NextToken);
      }
      else {
        if (items.length) {
          saveItems(domain);
        }
      
        if (domains.length) {
          getDomainItems(domains.shift());
        }
        else {
          log(['done']);
          log(['TotalItems:' + totalItems]);
        }
      }   
    }
  });
}

function saveItems(domain) {
  var filename = backup_buckets[getBucindex()] + domain + '.' + Date.now();
  //console.log(filename);
  
  fs.writeFileSync(filename, JSON.stringify(items));
  
  log(['saved', filename]);
  items = [];
}

function getBucindex() {
  var index = bucindex;
  bucindex++;
  
  if (bucindex >= backup_buckets.length) {
    bucindex = 0;
  }

  return index;
}

function log(message) {
  var data = new Date().toJSON() + ' - ' + message.join(' - ');
  console.log(data);
}