'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const conf = require('./conf/' + process.argv[2]);
const fs = require('fs');
const readline = require('readline');
const elasticsearch = require('elasticsearch');

const elastic = new elasticsearch.Client({
  host: conf.elasticsearch_host
  //, log: 'trace'
});

const logs_path = process.argv[3];
const processed_path = process.argv[4];
//const index_name = 's3access-2017';
const index_name = process.argv[5];

var logs = [];
var howmany = 5000;
var logs_processed = 0;
var files_processed = 0;
var currentFile;

var files = fs.readdirSync(logs_path);
console.log('#files:', files.length);
//files.reverse();


function startProcess(file) { 
  //console.log('start processing: ' + file);

  loadFile(file);
}

function loadFile(file) {
  currentFile = logs_path + file;
  //console.log(currentFile);

  const rl = readline.createInterface({ input: fs.createReadStream(currentFile) });
  rl.on('line', (line) => { logs.push(line); });
  rl.on('close', () => {
    //console.log('loaded: ' + file);
    //console.log('parsing: ' + file);
    //console.log(logs.length);

    logs_processed += logs.length;
    files_processed++;
    //console.log('logs_processed: ' + logs_processed + ' - files_processed: ' + files_processed + '     \r');
    process.stdout.write('logs_processed: ' + logs_processed + ' - files_processed: ' + files_processed + '     \r');

    if (logs.length) {
      parseLogs(logs.splice(0, howmany));
    }
    else {
      cleanUp(true);
    }
  });
}

function parseLogs(batch) {
  var bulk = [];
  var action = {};
  action.index = { _index: index_name, _type: 'doc'};

  for (var i=0; i < batch.length; i++) {
    var line = batch[i].split(' ');

    var bucket_owner = line[0];
    var bucket = line[1];
    var time = line[2] + ' ' + line[3];
    var remote_ip = line[4];
    var requester = line[5];
    var request_id = line[6];
    var operation = line[7];
    var key = line[8];
    var request_uri = line[9] + ' ' + line[10] + ' ' + line[11];
    var http_status = line[12];
    var error_code = line[13];
    var bytes_sent = line[14];
    var object_size = line[15];
    var total_time = line[16]; //ms
    var turn_around_time = line[17]; //ms
    var referrer = line[18];
    var ua_spaces = (line.length - 1) - 19;
    var user_agent = '';
    for (var j=0; j<ua_spaces; j++) {
      user_agent += line[19 + j] + ' ';
    }
    user_agent = user_agent.trim();
    var version_id = line[line.length -1];

    var t = time.slice(1, 21).split(':');
    var d = new Date(t[0]);
    d.setUTCHours(t[1]);
    d.setUTCMinutes(t[2]);
    d.setUTCSeconds(t[3]);

    if (bytes_sent == '-') {
      bytes_sent = 0;
    }

    if (key.startsWith('log/access_log')) {
      key = 'log/access_log-';
    }

    var doc = {};

    doc.timestamp = d.toJSON();
    doc.bucket = bucket;
    doc.remote_ip = remote_ip;
    doc.operation = operation;
    doc.key = key;
    doc.http_status = http_status;
    doc.error_code = error_code;
    doc.bytes_sent = bytes_sent;
    doc.object_size = object_size;
    doc.total_time = total_time;
    doc.turn_around_time = turn_around_time;
    doc.referrer = referrer;
    doc.user_agent = user_agent;

    bulk.push(action);
    bulk.push(doc);

    //console.log(doc);
  }

  elasticBulk(bulk);
}

function elasticBulk(bulk) {
  elastic.bulk({ body: bulk }, (err, res) => {
    if (err) {
      console.log(err);
    }
    else {
      //console.log(res);
      //console.log(res.items[0].index);

      if (logs.length > 0) {
        parseLogs(logs.splice(0, howmany));
      }
      else {
        //console.log('finished processing: ' + currentFile);
        cleanUp();
      }
    }
  });
}


function cleanUp(unlink) {
  if (unlink) {
    fs.unlinkSync(currentFile);
    console.log('deleted: ' + currentFile);
  }
  else {
    fs.renameSync(currentFile, currentFile.replace(logs_path, processed_path));
    //console.log('cleaned up: ' + currentFile);
  }

  if (files.length) {
    startProcess(files.shift());
  }
  else {
    console.log('no more files to process');
    console.log('logs_processed:', logs_processed);
  }
}


startProcess(files.shift());