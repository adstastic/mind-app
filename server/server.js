var fs      = require('fs');
var request = require('request');
var mysql   = require('mysql');
var express = require('express');

var fetch = false;
var array = [];
// print process.argv
process.argv.forEach(function (val, index, array) {
  array = array;
});

/** Adding function stripSlashes to String to remove '\' from JSON Strings */
String.prototype.stripSlashes = function(){
    return this.replace('\\"', '\"');
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
  var json_obj = JSONify(data);
  var outfile = 'gtrends.json';
  fs.writeFile('./'+outfile, JSON.stringify(json_obj, null, 2), function(err) {
      if (err) throw err;
      console.log("Saved JSON string to "+outfile);
  });
});


/** Read HTTP response data and parse to JSON */
function JSONify(data) {
    var json_data = data.split(/\((.+)?/)[1]; // Remove leading "google.visualization.Query.setResponse("
    json_data = json_data.slice(0, -2); // Remove last two characters (trailing ');') to correspond with leading
    var date_function_regex = /new\sDate\((\d{4}),(\d{1,2}),(\d{1,2})\)/g; // key of date field is given as function call, must be change to JSON compatible date for successful parsing
    json_str = json_data.replace(date_function_regex, function(match, yyyy, m, d) {
        // Replace match with date
        var date = new Date(yyyy, m, d);
        return JSON.stringify(date);
    });
    var json_obj = JSON.parse(json_str);
    return json_obj;
}
