var fs      = require('fs');
var request = require('request');
var mysql   = require('mysql');
var express = require('express');

var fetch = false;
var array = [];
// print process.argv
process.argv.forEach(function (val, index, array) {
  // console.log(index + ': ' + val);
  array = array;
});

String.prototype.stripSlashes = function(){
    return this.replace(/\\(.)/mg, "$1");
};

// check command line arguments
if (array[2] == 'fetch') {
    fetch = true;
} else if (!array[2]) {
    console.log("Running without fetching from sources...");
}

var app = express();
var url = 'http://www.google.com/trends/fetchComponent?q=als,ice%20bucket%20challenge&cid=TIMESERIES_GRAPH_0&export=3';

// fetch from data sources
if (fetch) {
    request({
        url: url,
        json: true,
    }, function(error, response, body) {
            if(!error){

                console.log(json);
            }
        }
    );
}

// read local .txt file and parse to JSON
fs.readFile('./gtrends.txt', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  var json = data.split(/\((.+)?/)[1];
  console.log(JSON.stringify(json.stripSlashes, null, 2));
});
