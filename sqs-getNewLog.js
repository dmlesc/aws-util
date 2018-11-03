'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const credentials = new AWS.SharedIniFileCredentials({profile: process.argv[2]});
AWS.config.credentials = credentials;
const sqs = new AWS.SQS({apiVersion: '2012-11-05'});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const fs = require('fs');
const mkdirp = require('mkdirp');

const bucket = process.argv[3];
const dst = process.argv[4];

const q_url = 'https://sqs.us-east-1.amazonaws.com/807358656365/elb-portal-log';


function init() {
  
}

function getQueueAttributes() {
  var params = {
    QueueUrl: q_url,
    AttributeNames: ['ApproximateNumberOfMessages']
  };

  sqs.getQueueAttributes(params, (err, data) => {
    if (err) { console.log('Error:', err, err.stack); }
    else { //console.log(data);
      var numMess = data.Attributes.ApproximateNumberOfMessages;
      console.log('numMess:', numMess);
      if (numMess > 0) {
        receiveMessages();
      }
      else {
        console.log('no messages on queue');
      }
    }
  });
}

function receiveMessages() {
  var params = {
    QueueUrl: q_url,
    MaxNumberOfMessages: 10,
    VisibilityTimeout: 60,
    WaitTimeSeconds: 0
  };

  var keys = [];
  var objs = [];
  
  sqs.receiveMessage(params, (err, data) => {
    if (err) { console.log('Error:', err, err.stack); }
    else { //console.log(data);
      for (var i=0; i<data.Messages.length; i++) {
        var message = data.Messages[i];
        var body = JSON.parse(message.Body);

        if (body.Records) {
          var key = body.Records[0].s3.object.key;

          if (keys.indexOf(key) == -1) {
            keys.push(key);
            objs.push({ key: key, handle: message.ReceiptHandle });
          }
        }
        else {
          console.log('delete:', message);
          deleteMessage(message.ReceiptHandle);
        }
      }

      getObjs(objs);
    }
  });
}

function getObjs(objs) {
  var obj = objs.shift();
  var key = obj.key;

  s3.getObject({ Bucket: bucket, Key: key }, (err, data) => {
    if (err) { console.log(err, err.stack); }
    else { //console.log(data);
      var file = key.split('/').reverse()[0];

      saveObj(dst + file, data.Body, key);
      deleteMessage(obj.handle);

      if (objs.length) {
        getObjs(objs);
      }
      else {
        console.log('All Downloaded');
        getQueueAttributes();
      }
    }
  });
}

function saveObj(path, body, key) {
  fs.writeFile(path, body, (err) => {
    if (err) { console.log('Error:', err); }
    else {
      console.log(path, '- Saved');
      //deleteObj(key);
    }
  });
}

function deleteMessage(handle) {
  sqs.deleteMessage({ QueueUrl: q_url, ReceiptHandle: handle }, (err, data) => {
    if (err) { console.log('Error:', err, err.stack); }
    else { //console.log(data);
      //console.log('message deleted');
    }
  });
}

function deleteObj(key) {
  s3.deleteObject({ Bucket: bucket, Key: key }, (err, data) => {
    if (err) { console.log(err, err.stack); }
    else {
      //console.log(data);
      console.log(key, '- Deleted');
    }
  });
}

getQueueAttributes();