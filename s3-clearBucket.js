'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const credentials = new AWS.SharedIniFileCredentials({profile: process.argv[2]});
AWS.config.credentials = credentials;
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

const bucket = process.argv[3];
var totalDeleted = 0;

function listObjs() {
  var params = { Bucket: bucket };

  s3.listObjects(params, (err, data) => {
    if (err) {
      console.log("Error", err);
    }
    else {
      /*
      console.log("Success", data);
      Object.keys(data).forEach( (key) => {
        console.log(key);
      });
      console.log(data.IsTruncated);
      */
  
      createParams(data, data.IsTruncated);
    }
  });
}


function createParams(data, more) {
  var objs = [];

  for (var i=0; i<data.Contents.length; i++) {
    var key = data.Contents[i].Key;
    objs.push({ Key: key});
  }
  //console.log(objs.length);

  deleteObjs(objs, more);
}

function deleteObjs(objs, more) {
  var params = {
    Bucket: bucket, 
    Delete: {
      Objects: objs,
      Quiet: false
    }
  };

  s3.deleteObjects(params, (err, data) => {
    if (err) {
      console.log(err, err.stack);
    }
    else {
      //console.log(data);

      totalDeleted += data.Deleted.length;
      console.log('Total keys Deleted:', totalDeleted);
      
      if (more) {
        listObjs();
      }
      else {
        console.log('bucket emptied');
      }
    }
  });
}

listObjs();