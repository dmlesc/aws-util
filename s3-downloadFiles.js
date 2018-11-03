'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const credentials = new AWS.SharedIniFileCredentials({profile: process.argv[2]});
AWS.config.credentials = credentials;
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const fs = require('fs');

const bucket = process.argv[3];
const dst = process.argv[4];
const prefix = process.argv[5];

var totalDowloaded = 0;

function listObjs(token) {
  console.log('listObjs');

  var params = { Bucket: bucket, Prefix: prefix };

  if (token)
    params.ContinuationToken = token;

  s3.listObjectsV2(params, (err, data) => {
    if (err) { console.log("Error", err); }
    else {
      createParams(data, data.NextContinuationToken);
    }
  });
}

function createParams(data, token) {
  console.log('createParams');
  var objs = [];

  for (var i=0; i<data.Contents.length; i++) {
    var key = data.Contents[i].Key;
    objs.push(key);
  }
  getObjs(objs, token);
}

function getObjs(objs, token) {
  process.stdout.write('objs: ' + objs.length + '\r');

  var key = objs.shift();

  var params = {
    Bucket: bucket, 
    Key: key
  };

  s3.getObject(params, (err, data) => {
    if (err) { console.log(err, err.stack); }
    else {
      //console.log(data);
      console.log(key, '- Downloaded');

      var file = key.split('/').reverse()[0];

      fs.writeFileSync(dst + file, data.Body);
      totalDowloaded++;

      deleteObj(key);
      
      if (objs.length) {
        getObjs(objs, token);
      }
      else if (token) {
        listObjs(token);
      }
      else {
        console.log('Total Downloaded:', totalDowloaded);
      }
    }
  });
}

function deleteObj(key) {
  var params = {
    Bucket: bucket,
    Key: key
  };

  s3.deleteObject(params, (err, data) => {
    if (err) { console.log(err, err.stack); }
    else {
      //console.log(data);
      console.log(key, '- Deleted');
    }
  });
}

listObjs();