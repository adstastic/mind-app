var fs      = require('fs');
var request = require('request');
var mysql   = require('mysql');
var express = require('express');
var sys = require('sys');
var exec = require('child_process').exec;


function puts(error, stdout, stderr) { console.log(stdout) };

function check_command_line_arguments() {
	var array = [];
	// process command line process arguments
	process.argv.forEach(function (val, index, array) {
	  	array = array;
	});

	if (array[2] == 'fetch') {
	    fetch();
	} else if (!array[2]) {
	    console.log("Running without fetching from sources...");
	}
}

/** Adding function stripSlashes to String to remove '\' from JSON Strings */
String.prototype.stripSlashes = function(){
    return this.replace('\\"', '\"');
};

var app = express();
var url = 'http://www.google.com/trends/fetchComponent?q=als,ice%20bucket%20challenge&cid=TIMESERIES_GRAPH_0&export=3';

function fetch() {
	// fetch from data sources
    request({
        url: url,
        json: true,
    }, function(error, response, body) {
            if(!error){
                response_to_json(body);
            }
        }
    );
}

function response_to_json(body, outfilename) {
	// read parse response body to JSON
 	var json_obj = JSONify(data);
  	var outfile = outfilename+'.json';
  	fs.writeFile('./'+outfile, JSON.stringify(json_obj, null, 2), function(err) {
    	if (err) throw err;
      	console.log("Saved JSON string to "+outfile);
  	});
}

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

function read_file(outfilename) {
	fs.readFile(outfilename, 'utf8', function (err,data) {
	  	if (err) {
	    	return console.log(err);
	  	}
        console.log("read data from "+outfilename);
  		return data;
  	});
}

var date_dict = {
    '1y'    : "today+12-m",
    '3m'     : "today+3-m",
    '1m'     : "today+1-m",
    '1w'     : "now+7-d",
    '1d'     : "now+1-d",
    '4h'     : "now+4-H",
    '1h'     : "now+1-H",
    'at'     : ""
};  

function get_csv_exec(query, date) {
	var q = encodeURIComponent(query.trim());
    var filename = './data.csv';
    console.log(filename);
	var command = 'wget -x --load-cookies ./cookies.txt -O '+filename;
	if (date == "") {
		for (var key in date_dict) {
			var date = date_dict[key];
			var csv_url ='https://www.google.co.uk/trends/trendsReport\?hl\=en-GB\&q\='+q+'\&geo\=GB\&date\='+d+'\&cmpt\=q\&tz\=Etc%2FGMT\&tz\=Etc%2FGMT\&content\=1\&export\=1';
			console.log(csv_url);
			exec(command+' '+csv_url, puts);
		}
	} else {
        var d = encodeURIComponent(date.trim());
        var csv_url = 'https://www.google.co.uk/trends/trendsReport\?hl\=en-GB\&q\='+q+'\&geo\=GB\&date\='+d+'\&cmpt\=q\&tz\=Etc%2FGMT\&tz\=Etc%2FGMT\&content\=1\&export\=1';
        console.log(encodeURIComponent(csv_url));
        exec(command+' '+csv_url, puts);
    }
}

// function jsdom_jsdom(html) {
// 	jsdom.defaultDocumentFeatures = { 
// 		  FetchExternalResources   : ['script', 'frame', 'iframe', 'link'],
// 		  ProcessExternalResources : ['script'],
// 		  MutationEvents           : '2.0',
// 		  QuerySelector            : false
// 	};

// 	// var htmlDoc = fs.readFileSync("./content.html");

// 	var document = jsdom.jsdom(html);
// 	var window = document.defaultView;

// 	window.onload = function () {
// 		$(window).document.body.find("svg").each(function(i, element) {
// 			var c = cheerio.load(html);
// 			console.log(c('div.time-chart-container').attr('id'));
// 		});
// 	}
// }

// function jsdom_env() {
// 	jsdom.env({
// 		url: "https://www.google.co.uk/trends/explore#q=transgender&date=now%201-H&cmpt=q&tz=Etc%2FGMT",
// 		scripts: ["http://code.jquery.com/jquery.js"],
// 		done: function (err, window) {
// 		}
// 	});
// }

function main() {
	check_command_line_arguments();
	get_csv_exec('mind charity', '1/2015+1m');	
}

main();
