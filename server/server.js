var fs      = require('fs'),
    request = require('request'),
    mysql   = require('mysql'),
    express = require('express'),
    sys = require('sys'),
    exec = require('child_process').exec,
    path = require('path'),
    sprintf = require("sprintf-js").sprintf,
    cookie = require('cookies.txt');

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

function change_to_file_directory() {
    try {
      process.chdir(__dirname);
      console.log('Current directory: ' + process.cwd());
    }
    catch (err) {
      console.log('chdir: ' + err);
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

function read_file(outfilename, callback) {
	fs.readFile(outfilename, 'utf8', function (err,data) {
	  	if (err) {
	    	return console.log(err);
	  	}
        console.log("read data from "+outfilename);
  		callback(data);
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
			var csv_url ='https://www.google.co.uk/trends/trendsReport\?hl\=en-GB\\\&q\='+q+'\\\&geo\=GB\\\&date\='+d+'\\\&cmpt\=q\\\&tz\=Etc%2FGMT\\\&tz\=Etc%2FGMT\\\&content\=1\\\&export\=1';
			console.log(csv_url);
			exec(command+' '+csv_url, puts);
		}
	} else {
        var d = encodeURIComponent(date.trim());
        var csv_url = 'https://www.google.co.uk/trends/trendsReport\?hl\=en-GB\\\&q\='+q+'\\\&geo\=GB\\\&date\='+d+'\\\&cmpt\=q\\\&tz\=Etc%2FGMT\\\&tz\=Etc%2FGMT\\\&content\=1\\\&export\=1';
        console.log(encodeURIComponent(csv_url));
        exec(command+' '+csv_url, puts);
    }
}

function extract_csv_data(data, options, callback) {
    var values = data.match(/\d{4}-\d{2}-\d{2}-\d{2}:\d{2}\s\w{3},\d+/gm);
    for (var i=0; i<values.length; i++) {
        var line = values[i].split(',');
        line[0] = line[0].match(/\d{4}-\d{2}-\d{2}-\d{2}:\d{2}/g);
        values[i] = [line[0].toString(), parseFloat(line[1])];
    }
    values.unshift(['time', 'relative interest']); // add element to beginning of array
    if (options.json) {
        values = JSON.stringify(values, null, 2);
    }
    if (typeof callback ==  "function") {
        callback(values);      
    } else {    
        return values;
    }
}


// Adds leading 0's to all date params and concat's to last 2 characters to ensure 2 digit output
function pretty_timestamp() {
    var d = new Date()
    var second = ('0' + d.getSeconds()).slice(-2),
        minute = ('0' + d.getMinutes()).slice(-2),
        hour = ('0' + d.getHours()).slice(-2),
        day = ('0' + d.getDay()).slice(-2),
        month = ('0' + d.getDay()+1).slice(-2),
        year = d.getFullYear();
    var formatted_date = sprintf('%s-%s-%s.%s:%s:%s', day, month, year, hour, minute, second)
    return formatted_date
}

function wget(options, callback) {
    var filename;
    
    function execute(cmd, callback) {
        console.log('Executing: '+cmd);
        exec(cmd, function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
              console.log('exec error: ' + error);
            }
            if (typeof callback == "function") {
                read_file(filename, callback); // sends stdout to callback
            } 
        });
    }
    
    if (options.query && options.date) {
        var query = options.query.trim(), // remove leading and trailing whitespace
            date = date_dict[options.date];
        var URL = 'https://www.google.co.uk/trends/trendsReport\?hl\=en-GB\\&q\='+query+'\\&geo\=GB\\&date\='+date+'\\&cmpt\=q\\&tz\=Etc%2FGMT\\&tz\=Etc%2FGMT\\&content\=1\\&export\=1';
        if (options.print) { // print to stdout (redirect to console)
            var cmd = 'wget -x --load-cookies ./cookies.txt -O - -o /dev/null '+ URL;
        } else { 
            if (options.filename) {
                var filename = options.filename;
            } else { // set filename with datetime and search params
                var d = new Date();
                filename = sprintf("%s-%s.%s.csv", query, options.date, pretty_timestamp());
            }
            var cmd = 'wget -x --load-cookies ./cookies.txt -O "'+filename.toString() +'" '+ URL;
        }
        execute(cmd, callback);
    }
    
}

function main() {
	check_command_line_arguments();
    change_to_file_directory();
    // extract_csv_data('shtest.csv');
    // wget('hello', date_dict['1h']);
    // cookie.parse('./cookies.txt', function (jsonCookie) {
    //     var URL = 'https://www.google.co.uk/trends/trendsReport?hl=en-GB&q=hello&geo=GB&date=&cmpt=q&tz=Etc%2FGMT&content=1&export=1';
        
    //     var options = {
    //       url: URL,
    //       headers: {
    //         'Cookie' : jsonCookie
    //       }
    //     };
        
    //     function callback(error, response, body) {
    //       if (!error && response.statusCode == 200) {
    //         console.log(body);
    //       }
    //     }
        
    //     request(options, callback);
    // });
}

main();


var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/', express.static(__dirname + '/../frontend'));

// for dev, will be removed in final
app.use('/datavis', express.static(__dirname + '/../DataVisualisation'));

io.on('connection', function(client) {
    console.log('Client '+ client.id + ' connected.');
    
    client.on('join', function(data) {
        console.log(data);
        client.emit('messages', 'hello from server');
    });
    
    client.on('disconnect', function(data) {
        console.log('Client '+ client.id + ' disconnected.');
    });
    
    client.on('search', function(data) {
        console.log('Search from client: ', data);
        switch (data.data) {
            case 'google':
                console.log('Getting data from Google');
                var options = {
                    query   : data.query,
                    date    : data.date,
                    print   : false
                };
                wget(options, function(results) {
                    var csv_data = extract_csv_data(results, { json : false })
                    client.emit('results', csv_data)
                });
                break;
            case 'twitter':
                console.log('Getting data from Twitter');
                var response = 0; /* get twitter data*/
                break;
            case 'instagram':
                console.log('Getting data from Instagram');
                var response = 0; /* get instagram data*/
                break;
        }
    })
})

server.listen(process.env.PORT || 3000);
