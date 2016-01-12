var fs = require('fs'),
    request = require('request'),
    // mysql   = require('mysql'),
    express = require('express'),
    // sys = require('sys'),
    exec = require('child_process').exec,
    // path = require('path'),
    sprintf = require("sprintf-js").sprintf,
    // cookie = require('cookies.txt'),
    Twit = require('twit');
    
function puts(error, stdout, stderr) { console.log(stdout) }

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
 	var json_obj = JSONify(body);
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
    var json_str = json_data.replace(date_function_regex, function(match, yyyy, m, d) {
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
    'Last Year'    : "today+12-m",
    '3m'     : "today+3-m",
    'Last Month'     : "today+1-m",
    'Last Week'     : "now+7-d",
    'Last Day'     : "now+1-d",
    '4h'     : "now+4-H",
    'Last Hour'     : "now+1-H",
    'ALl Time'     : ""
};  

function extract_csv_data(data, options, callback) {
    var values = data.match(/\d{4}-\d{2}-\d{2}-\d{2}:\d{2}\s\w{3},\d+/gm);
    // if (values) {
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
    // }
}


// Adds leading 0's to all date params and concat's to last 2 characters to ensure 2 digit output
function pretty_timestamp() {
    var d = new Date();
    var second = ('0' + d.getSeconds()).slice(-2),
        minute = ('0' + d.getMinutes()).slice(-2),
        hour = ('0' + d.getHours()).slice(-2),
        day = ('0' + d.getDay()).slice(-2),
        month = ('0' + d.getDay()+1).slice(-2),
        year = d.getFullYear();
    var formatted_date = sprintf('%s-%s-%s.%s:%s:%s', day, month, year, hour, minute, second);
    return formatted_date;
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
                // read_file(filename, callback); // sends stdout to callback
                callback(stdout);
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
                filename = options.filename;
            } else { // set filename with datetime and search params
                filename = sprintf("%s-%s.%s.csv", query, options.date, pretty_timestamp());
            }
            cmd = 'wget -x --load-cookies ./cookies.txt -O "'+filename.toString() +'" '+ URL;
        }
        execute(cmd, callback);
    }
    
}

function main() {
	check_command_line_arguments();
    change_to_file_directory();
}

main();

// change the keys and secrets to environment variables later for security, set using command line when node instantiated or using export




function search(string, keywords) {
    var found;
    for (var i = 0; i < keywords.length; i++) {
        var keyword = keywords[i].toLowerCase();
        if (string.search(keyword) > -1) {
            found = true;
            break;
        } 
        else found = false;
    }
    return found;
}   

(function () {
    
    var app = express();
    var server = require('http').createServer(app);
    var io = require('socket.io')(server);
    
    var twitter = new Twit({
        consumer_key : 'kirRWQYmrpOB45THZFXSICM2u',
        consumer_secret : '1m2q5Q0tAPInrjGrvPQ1manCo27oAXWMdOcMaBFNA8iubjAini',
        access_token : '33188875-5YWOXnLbgSRl8Tsfkjjqm2ao5uA0OuXQY8vg2tsbo',
        access_token_secret : 'tqSIAHX6X9b8RnARVYahNtod3AWvf414dOPr57zqFx5aX'
    });
    
    twitter.get('search/tweets', 
        {
            q : '#mentalhealth',
            since : 2007-01-01
        },
        function (twitter_err, data, response) {
            var subset = data.statuses;
            if (twitter_err) throw twitter_err;
        // 	fs.writeFile('./twitter_test.json', JSON.stringify(data.statuses.slice(0,2), null, 4), function(fs_err) {
        // 	    if (fs_err) throw fs_err;
        //       	console.log("Saved JSON string");
        //   	});
          	for (var status in subset) {
          	    var hashtags = subset[status].entities.hashtags;
          	    for (var hashtag in hashtags) {
          	        console.log(hashtags[hashtag].text);
          	    }
          	}
        }
    );
    
    var search_terms = "mindcharity,mentalhealth,Abuse,Addiction,dependency,Advocacy,Aftercare,Anger,Antidepressants,Antidepressants,Antipsychotics,Anxiety,panic attacks,Arts therapies,Benefits,Bereavement,Bipolar disorder,Body dysmorphic disorder,Borderline personality disorder,BPD,Carers,coping,Clinical Negligence,Cognitive behavioural therapy,CBT,Community care,aftercare,mental health,social care,Complementary therapy,alternative therapy,Consent to treatment,CRHT,Crisis services,Debt and mental health,Depression,Dialectical behaviour therapy,Disability discrimination,Discharge from hospital,Discrimination at work,Dissociative disorders,Driving,Drugs - street drugs & alcohol,Eating problems,Ecotherapy,Electroconvulsive therapy,Financial help,Hearing voices,Hoarding,Holidays and respite care,Housing,Human Rights Act 1998,Hypomania and mania,IMHAs (England),IMHAs (Wales),Insurance cover and mental health,Learning disability support,LGBT mental health,Lithium and other mood stabilisers,Loneliness,Medication,Medication - drugs A-Z,Medication - stopping or coming off,Mental Capacity Act 2005,Mental Health Act 1983,Mental health and the courts,Mental health and the police,Mental health problems,Mindfulness,Money and mental health,Nearest relative,Neurosurgery for mental disorder,Obsessive-compulsive disorder,ocd,Online safety and support,Panic attacks,Paranoia,Parenting with a mental health problem,Peer support,Personal budgets,Personal information,Personality disorders,Phobias,Physical activity, sport and exercise,Postnatal depression,Post-traumatic stress disorder,ptsd,Psychosis,Relaxation,Schizoaffective disorder,Schizophrenia,Seasonal affective disorder,Sectioning,Seeking help for a mental health problem,Self-esteem,Self-harm,Sleep problems,Sleep problems,Sleeping pills,tranquillisers,St John's wort,mental health statistics,mental health facts,Stress,Student life,Suicidal feelings,Suicide,Talking treatments,Tardive dyskinesia,Wellbeing,emergency services";
    
    var search_array = search_terms.split(',');
    
    function process_tweet(tweet) {
        console.time('process_tweet');
        if (search(tweet.text.toLowerCase(), search_array)) {
            var location = ((tweet.place.country) ? tweet.place.country : tweet.user.location);
            if (tweet.entities.hashtags) {
                for (var hashtag in tweet.entities.hashtags) {
                    console.log(hashtag);
                }
            }
            var tweet_data = { user: tweet.user.name, text : tweet.text, location : location }
            console.timeEnd('process_tweet');
            return tweet_data;
        } else return null;
    } 
    
    /* Twitter stream for geolocation bounding box around UK */
    var uk = ['-9.05', '48.77', '2.19', '58.88'];
    
    var stream_location = twitter.stream('statuses/filter', { /*rack: search_terms,*/locations: uk/*, language : 'en'*/ })  
    var count_location = 0;
    
    stream_location.on('tweet', function(tweet) {
        if (process_tweet(tweet)) {
            var tweet_data = process_tweet(tweet);
            console.log(count_location++);
            console.log(tweet_data);
            io.sockets.emit('twitter', tweet_data);
        };
    });
    
    stream_location.on('error', function(error) {
        console.log(error);
    });
    
    
    
    /* Twitter stream for keywords */
    // var stream_keywords = twitter.stream('statuses/filter', { track: search_terms,/*locations: uk,*/ language : 'en'})  
    // var count_keywords = 0;
    
    // stream_keywords.on('tweet', function(tweet) {
    //     io.sockets.emit('twitter', tweet.text);
    // });
    
    // stream_keywords.on('error', function(error) {
    //     io.sockets.emit('twitter', error);
    // });

    
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
                case 'Google Trends':
                    console.log('Getting data from Google');
                    var options = {
                        query   : data.query,
                        date    : data.date,
                        print   : true
                    };
                    wget(options, function(results) {
                        var csv_data = extract_csv_data(results, { json : false })
                        console.log(csv_data);
                        client.emit('results', { data : csv_data, title : data.query })
                    });
                    break;
                case 'Twitter':
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
})();
