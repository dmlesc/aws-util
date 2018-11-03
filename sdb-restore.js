'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const fs = require('fs');
const chokidar = require('chokidar');

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const credentials = new AWS.SharedIniFileCredentials({profile: process.argv[2]});
AWS.config.credentials = credentials;
const simpledb = new AWS.SimpleDB({apiVersion: '2009-04-15'});

const backup_path = process.argv[3];
const restored_path = './restored/';
const poison_path = './poison/';
const dead_path = './dead/';

const interval = 1000;  // ms
const wait = 250; // ms

var newFiles = {};
var queuedFiles = [];
var alreadyCheckingSize = false;
var alreadyProcessing = false;

var currentFile;
var domain;
var items;
var totalItems = 0;
var howmany = 25;


var watcher = chokidar.watch(backup_path, {
  ignored: /[\/\\]\./,
  persistent: true
});

watcher
  .on('error', (error) => { error('watcher error: ', error); })
  .on('add', (path) => { 
    log(['added: ' + path]);
    newFiles[path] = {};
    var stats = fs.statSync(path);
    newFiles[path].size = stats.size;
    setTimeout(hasSizeChanged, interval);
  })
  .on('change', (path, stats) => {
    if (stats) {
      //log('changed: ' + path + ' - size: ' + stats.size);
    }
});

function hasSizeChanged() {
  log(['hasSizeChanged']);

  if (alreadyCheckingSize) {
    log(['alreadyCheckingSize']);
  }
  else {
    alreadyCheckingSize = true;

    for (var path in newFiles) {
      var size = newFiles[path].size;
      var stats = fs.statSync(path);

      if (size === stats.size) {
        queuedFiles.push(path);
        log(['pushed to queue: ' + path]);
        delete newFiles[path];
        setTimeout(checkForQueuedFiles, interval);
      }
      else {
        log(['changed: ' + path, 'size: ' + stats.size]);
        newFiles[path].size = stats.size;
        setTimeout(hasSizeChanged, interval);
      }
    }
    alreadyCheckingSize = false;
  }
}

function checkForQueuedFiles() {
  log(['checkForQueuedFiles']);

  if (alreadyProcessing) {
    log(['alreadyProcessing']);
  }
  else if (queuedFiles.length) {
    alreadyProcessing = true;
    startProcess(queuedFiles.shift());
  }
  else {
    log(['no queued files']);
  }
}

function startProcess(file) { 
  currentFile = file.replace(backup_path, '');
  //domain = currentFile.split('.')[0] + '_RESTORE';
  domain = currentFile.split('.')[0];
  
  log(['domain: ' + domain]);
  log(['start restoring: ' + file]);
  loadFile(file);
}

function loadFile(file) {
  items = JSON.parse(fs.readFileSync(file));
  log(['loaded: ' + file]);
  log(['processing: ' + file]);
  putItems(items.splice(0, howmany));
}

function putItems(batch) {
  var params = {
    DomainName: domain,
    Items: batch
  };

  simpledb.batchPutAttributes(params, (err, data) => {
    if (err) {
      log([err, err.stack]);
      //log(['batch:', JSON.stringify(batch)]);

      if (backup_path == 'poison/') {
        var match = /InvalidParameterType: Expected params.Items\[\d*\].Attributes\[\d*\].Value to be a string/g;
        var matches = err.toString().match(match);
  
        if (matches && matches.length) {
          console.log('matches:', matches);
  
          var indexes = /\[\d*\]/g;
  
          for (var i=0; i<matches.length; i++) {
            var str = matches[i];
  
            var res1 = str.match(indexes);
            console.log('res1:', res1);
            
            var item = res1[0].replace(/\[|\]/g, '');
            var attr = res1[1].replace(/\[|\]/g, '');
            console.log('item:', item, 'attr:', attr);
  
            console.log('bad:', JSON.stringify(params.Items[item].Attributes[attr]));
            console.log('bad:', JSON.stringify(params.Items[item].Name));

            var buff = new Buffer(params.Items[item].Attributes[attr].Value.data, 'base64');
            var ascii = buff.toString('ascii');
            console.log('ascii:', ascii);

            batch[item].Attributes[attr].Value = ascii;
          }
        }
        else {
          log(['dead', currentFile]);
          cleanUp(dead_path, '.dead');
        }
  
        log(['\n\nretrying in 20 seconds...\n']);
        setTimeout(putItems, 20000, batch);
      }
      else {
        log(['poison', currentFile]);
        cleanUp(poison_path, '.poison');
      }

    } 
    else {
      //console.log(data);
      totalItems += batch.length;
      log(['domain:' + domain, 'items:' + items.length, 'totalItems:' + totalItems]);

      if (items.length) {
        putItems(items.splice(0, howmany));
        //setTimeout(putItems, wait, items.splice(0, howmany));
      }
      else {
        log(['finished restoring: ' + currentFile]);
        cleanUp(restored_path, '.restored');
      }
    }
  });
}

function cleanUp(newfolder, suffix) {
  var src = backup_path + currentFile;
  var dst = newfolder + currentFile + suffix;

  fs.renameSync(src, dst);
  log(['moved: ' + dst]);

  if (queuedFiles.length) {
    startProcess(queuedFiles.shift());
  }
  else {
    alreadyProcessing = false;
    log(['no more files to restore']);
  }
}

function log(message) {
  var data = new Date().toJSON() + ' - ' + message.join(' - ');
  console.log(data);
}