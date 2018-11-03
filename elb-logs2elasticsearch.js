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

const src = process.argv[3];
const dst = process.argv[4];
const index_name = process.argv[5];

var logs = [];
var howmany = 5000;
var files_processed = 0;
var currentFile;

var files = fs.readdirSync(src);
console.log('#files:', files.length);
//files.reverse();


function startProcess(file) { 
  //console.log('start processing: ' + file);

  loadFile(file);
}

function loadFile(file) {
  currentFile = src + file;
  //console.log(currentFile);

  const rl = readline.createInterface({ input: fs.createReadStream(currentFile) });
  rl.on('line', (line) => { logs.push(line); });
  rl.on('close', () => {
    //console.log('loaded: ' + file);
    //console.log('parsing: ' + file);
    //console.log(logs.length);

    files_processed++;
    //console.log('files_processed:', files_processed);
    process.stdout.write('files_processed: ' + files_processed + '     \r');

    if (logs.length > 0) {
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

    var timestamp = line[0];
    var elb = line[1];
    var client = line[2];
    var backend = line[3];

    var client_host = client.split(':')[0];
    var client_port = client.split(':')[1];
    var backend_host = backend.split(':')[0];
    var backend_port = backend.split(':')[1];
    
    var request_processing_time = line[4];
    var backend_processing_time = line[5];
    var response_processing_time = line[6];
    var elb_status_code = line[7];
    var backend_status_code = line[8];
    var received_bytes = line[9];
    var sent_bytes = line[10];

    var request = (line[11] + ' ' + line[12] + ' ' + line[13]).replace(/"/g, '');
    var req_splt = request.split(' ');
    var req_method = req_splt[0];
    var req_path = req_splt[1];
    var req_http_version = req_splt[2];

    var user_agent = line.slice(14, line.length - 2).join(' ').replace(/"/g, '');
    var ssl_cipher = line[line.length - 2];
    var ssl_protocol = line[line.length - 1];

    var doc = {};

    doc.timestamp = timestamp;
    doc.client_host = client_host;
    doc.backend_host = backend_host;
    doc.request_time = sec2ms(request_processing_time);
    doc.backend_time = sec2ms(backend_processing_time);
    doc.response_time = sec2ms(response_processing_time);
    doc.elb_status_code = elb_status_code;
    doc.backend_status_code = backend_status_code;
    doc.received_bytes = received_bytes;
    doc.sent_bytes = sent_bytes;
    doc.req_method = req_method;
    doc.req_path = req_path;
    doc.user_agent = user_agent;

    bulk.push(action);
    bulk.push(doc);

    //console.log(doc);
  }

  elasticBulk(bulk);
}


function sec2ms(str) {
  //console.log('str:', str);
  var ms = 0;

  if (str != '-1') {
    var str = str.split('.'); 
    var seconds = Number(str[0]);
    var decimal = str[1].split('');
    decimal.splice(3, 0, '.');
    decimal = parseFloat(decimal.join(''));
    var ms = (seconds * 1000) + decimal;
  }

  return ms;
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
    fs.renameSync(currentFile, currentFile.replace(src, dst));
    //console.log('cleaned up: ' + currentFile);
  }

  if (files.length) {
    startProcess(files.shift());
  }
  else {
    console.log('no more files to process');
    console.log('files_processed:', files_processed);
  }
}


startProcess(files.shift());