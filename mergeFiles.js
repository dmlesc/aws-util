'use strict';
process.on('uncaughtException', (err) => { console.log(err); });

const src = process.argv[2];
const dst = process.argv[3];
console.log('src:', src, 'dst:', dst);

const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');

var logs = [];
var files_merged = 0;
var logsLimit = 500000;
var currentFile;
var prefix = src.split('/').reverse()[1];
var files_deleted = 0;

var files = fs.readdirSync(src);
console.log('#files:', files.length);

function merge(file) { 
  currentFile = src + file;

  const rl = readline.createInterface({ input: fs.createReadStream(currentFile) });
  rl.on('line', (line) => { logs.push(line); });
  rl.on('close', () => {
    files_merged++;
    process.stdout.write('files_merged: ' + files_merged + '     \r');

    if (logs.length >= logsLimit) {
      console.log('logsLimit reached:', logs.length);
      saveLogs();
    }

    if (files.length) {
      merge(files.shift());
    }
    else {
      console.log('no more files to merge');
      console.log('logs.length:', logs.length);
      saveLogs();
      console.log('files_merged:', files_merged);
      cleanUp();
    }
  });
}

function saveLogs() {
  var filename = dst + prefix + '_' + Date.now() + '.gz';
  fs.writeFileSync(filename, zlib.gzipSync(JSON.stringify(logs)));
  logs = [];
  console.log('file saved:', filename);
}

function cleanUp() {
  var files = fs.readdirSync(src);
  console.log('#files:', files.length);

  for (var i=0; i<files.length; i++) {
    fs.unlinkSync(src + files[i]);
    files_deleted++;
    process.stdout.write('files_deleted: ' + files_deleted + '     \r');
  }

  console.log('no more files to delete');
  console.log('files_deleted:', files_deleted);
}


merge(files.shift());

//cleanUp();