var fs      = require('fs'),
    exec    = require('child_process').exec,
    Loki    = require('lokijs'),
    Express = require('express'),
    Twit    = require('twit'),
    _       = require('underscore'),
    Sprintf = require("sprintf-js").sprintf,
    Request = require('request');

process.on('uncaughtException', function (e) {
  console.log(new Date().toISOString(), e.stack || e);
  process.exit(1);
});

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
    Request({
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

var date_syntax = {
    week: 'YYYY-MM-DD - YYYY-MM-DD,VV',
    day: 'YYYY-MM-DD,VV',
    time: 'YYYY-MM-DD-HH:mm ZZZ,VV'
};

var regex_day_hour = /\d{4}-\d{2}-\d{2}-\d{2}:\d{2}\s\w{3},\d+/gm,
    regex_month = /\d{4}-\d{2}-\d{2},\d+/gm,
    regex_year = /\d{4}-\d{2}-\d{2}\s-\s\d{4}-\d{2}-\d{2},\d+/gm;

var date_dict = {
    'Last Hour' : ["now+1-H", regex_day_hour],
    '4h' : ["now+4-H", regex_day_hour],
    'Last Day' : ["now+1-d", regex_day_hour],
    'Last Week' : ["now+7-d", regex_day_hour],
    'Last Month' : ["today+1-m", regex_month],
    '3m' : ["today+3-m", regex_month],
    'Last Year' : ["today+12-m", regex_year],
    'All Time' : ["", regex_year]
};  

function extract_csv_data(data, options, callback) {
    var regex = date_dict[options.date][1]; 
    var values = data.match(regex);
    try {
        for (var i=0; i<values.length; i++) {
            var line = values[i].split(/[\s,:-]+/);
            var year    = line[0],
                month   = line[1]-1,
                day     = line[2];
            var date = new Date(year, month, day);
            console.log(date)
            if (line[3].length == 2) {
                date.setHours(line[3]); 
                date.setMinutes(line[4]);
            }
            
            var value = line[line.length-1];
            
            values[i] = [date.toISOString(), parseFloat(value)];
        }
        values.unshift(['time', 'relative interest']); // add element to beginning of array
        if (options.json) {
            values = JSON.stringify(values, null, 2);
        }
        if (typeof callback ==  "function") {
            callback(values);      
        } else  return values;
    }
    catch(e) {
        console.error("extract_csv_data:",e.message);
    }
}

// Adds leading 0's to all date params and concat's to last 2 characters to ensure 2 digit output
function pretty_timestamp() {
    var d = new Date();
    var second = ('0' + d.getSeconds()).slice(-2),
        minute = ('0' + d.getMinutes()).slice(-2),
        hour = ('0' + d.getHours()).slice(-2),
        day = ('0' + d.getDay()).slice(-2),
        month = ('0' + d.getDay()+1).slice(-2), // js months are indexed from 0
        year = d.getFullYear();
    var formatted_date = Sprintf('%s-%s-%s.%s:%s:%s', day, month, year, hour, minute, second);
    return formatted_date;
}

function wget(options, callback) {
    var filename;
    
    function execute(cmd, callback) {
        console.log('Executing: '+cmd);
        try {
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
        catch (e) {
            console.error("wget > execute:",e);
        }
    }
    
    if (options.query && options.date) {
        var query = options.query.trim(), // remove leading and trailing whitespace
            date = date_dict[options.date][0];
        var URL = 'https://www.google.co.uk/trends/trendsReport\?hl\=en-GB\\&q\='+query+'\\&geo\=GB\\&date\='+date+'\\&cmpt\=q\\&tz\=Etc%2FGMT\\&tz\=Etc%2FGMT\\&content\=1\\&export\=1';
        if (options.print) { // print to stdout (redirect to console)
            var cmd = 'wget -x --load-cookies ./cookies.txt -O - -o /dev/null '+ URL;
        } else { 
            if (options.filename) {
                filename = options.filename;
            } else { // set filename with datetime and search params
                filename = Sprintf("%s-%s.%s.csv", query, options.date, pretty_timestamp());
            }
            cmd = 'wget -x --load-cookies ./cookies.txt -O "'+filename.toString() +'" '+ URL;
        }
        execute(cmd, callback);
    }
    
}

function search(string, keywords) {
    var found;
    try {
    for (var i = 0; i < keywords.length; i++) {
        var keyword = keywords[i].toLowerCase();
        if (string.search(keyword) > -1) {
            found = true;
            break;
        } 
        else found = false;
    }
    }
    catch (e) {
        console.error("search:",e)
    }
    return found;
}   

function process_tweet(tweet, search_array) {
    // console.time('process_tweet');
    if (search(tweet.text.toLowerCase(), search_array)) {
        var location = ((tweet.place.country) ? tweet.place.country : tweet.user.location);
        if (tweet.entities.hashtags) {
            for (var hashtag in tweet.entities.hashtags) {
                console.log(hashtag);
            }
        }
        var tweet_data = { user: tweet.user.name, text : tweet.text, location : location }
        // console.timeEnd('process_tweet');
        return tweet_data;
    } else return null; 
} 

function main() {
	check_command_line_arguments();
    change_to_file_directory();
}

main();

// var idbAdapter = new LokiIndexedAdapter('loki');
var DB  = new Loki('./test.json');
try {
    var db_json = fs.readFileSync('./test.json', {
        encoding: 'utf8'
    });
    DB.loadJSON(db_json);
} catch (e) {
    console.error("loki.loadDatabase:", e);
    var date = new Date();
    var dbpath = date.toISOString() + "_db.json";
    DB = new Loki(dbpath);
    console.log("created new DB: ", dbpath);
}

var TWITTER = DB.addCollection('twitter');
var GOOGLE = DB.addCollection('google');

var app = Express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
// change the keys and secrets to environment variables later for security, set using command line when node instantiated or using export
var twitter = new Twit({
    consumer_key : 'kirRWQYmrpOB45THZFXSICM2u',
    consumer_secret : '1m2q5Q0tAPInrjGrvPQ1manCo27oAXWMdOcMaBFNA8iubjAini',
    access_token : '33188875-5YWOXnLbgSRl8Tsfkjjqm2ao5uA0OuXQY8vg2tsbo',
    access_token_secret : 'tqSIAHX6X9b8RnARVYahNtod3AWvf414dOPr57zqFx5aX'
});

function search_tweets(twitter, params, callback) {
    try {
        twitter.get('search/tweets', params,
            function (twitter_err, data, response) {
                var subset = data.statuses;
                if (twitter_err) throw twitter_err;
            // 	fs.writeFile('./twitter_test.json', JSON.stringify(data.statuses.slice(0,2), null, 4), function(fs_err) {
            // 	    if (fs_err) throw fs_err;
            //       	console.log("Saved JSON string");
            //   	});
                var tweets = [];
              	for (var status in subset) {
              	    var status = subset[status];
              	    var status = { 
              	        created_at  :   new Date(status.created_at).toISOString(),
              	        date        :   new Date(status.created_at).getDate(),
              	        id          :   status.id,
              	        place       :   (status.place || status.user.location),
              	        text        :   status.text,
              	        hashtags    :   status.entities.hashtags
              	    }
              	    tweets.push(status);
              	}
              	var tweets_by_day_hour = _.chain(tweets)
                    .groupBy(function(tweet){
                        var date = new Date(tweet.created_at); 
                        return date.getDate();
                    })
                    .indexBy(function(tweets_by_day) {
                        var tweet = _.sample(tweets_by_day);
                        return tweet.date;
                    })
                    .map(function(tweets_by_day) { 
                        return _.groupBy(tweets_by_day, function(tweet) {
                            var date = new Date(tweet.created_at); 
                            return date.getHours();
                        });
                    })
                    .value();
                    
                // var tweets_by_day = _.groupBy(function(tweet){
                //     var date = new Date(tweet.created_at); 
                //     return date.getDate();
                // });
                
                // _.each(tweets_by_day, function(tweets, index) {
                //     console.log(tweets);
                //     _.groupBy(tweets, function(tweet) {
                //         console.log(tweet);
                //         // var date = new Date(tweet.created_at); 
                //         // return date.getDate();
                //     })
                // });
                
                // fs.writeFile('./twitter-search.json', JSON.stringify(tweets_by_day_hour, null, 2));
                callback(tweets_by_day_hour);     
            }
        );
    }
    catch (e) {
        console.error("twitter.get search/tweets:",e)
        return null;
    }
}

var search_terms = "mindcharity,mentalhealth,Abuse,Addiction,dependency,Advocacy,Aftercare,Anger,Antidepressants,Antidepressants,Antipsychotics,Anxiety,panic attacks,Arts therapies,Benefits,Bereavement,Bipolar disorder,Body dysmorphic disorder,Borderline personality disorder,BPD,Carers,coping,Clinical Negligence,Cognitive behavioural therapy,CBT,Community care,aftercare,mental health,social care,Complementary therapy,alternative therapy,Consent to treatment,CRHT,Crisis services,Debt and mental health,Depression,Dialectical behaviour therapy,Disability discrimination,Discharge from hospital,Discrimination at work,Dissociative disorders,Driving,Drugs - street drugs & alcohol,Eating problems,Ecotherapy,Electroconvulsive therapy,Financial help,Hearing voices,Hoarding,Holidays and respite care,Housing,Human Rights Act 1998,Hypomania and mania,IMHAs (England),IMHAs (Wales),Insurance cover and mental health,Learning disability support,LGBT mental health,Lithium and other mood stabilisers,Loneliness,Medication,Medication - drugs A-Z,Medication - stopping or coming off,Mental Capacity Act 2005,Mental Health Act 1983,Mental health and the courts,Mental health and the police,Mental health problems,Mindfulness,Money and mental health,Nearest relative,Neurosurgery for mental disorder,Obsessive-compulsive disorder,ocd,Online safety and support,Panic attacks,Paranoia,Parenting with a mental health problem,Peer support,Personal budgets,Personal information,Personality disorders,Phobias,Physical activity,Postnatal depression,Post-traumatic stress disorder,ptsd,Psychosis,Relaxation,Schizoaffective disorder,Schizophrenia,Seasonal affective disorder,Sectioning,Seeking help for a mental health problem,Self-esteem,Self-harm,Sleep problems,Sleep problems,Sleeping pills,tranquillisers,St John's wort,mental health statistics,mental health facts,Stress,Student life,Suicidal feelings,Suicide,Talking treatments,Tardive dyskinesia,Wellbeing,emergency services";

var search_array = search_terms.split(',');


/* Twitter stream for geolocation bounding box around UK */
var uk = ['-9.05', '48.77', '2.19', '58.88'];

var stream_location = twitter.stream('statuses/filter', { /*rack: search_terms,*/locations: uk/*, language : 'en'*/ })  
var count_location = 0;
var count = 0;

try {
stream_location.on('tweet', function(tweet) {
    process.stdout.write((count++).toString()+" ");
    if (process_tweet(tweet, search_array)) {
        TWITTER.insert(tweet);
        DB.saveDatabase();
        var tweet_data = process_tweet(tweet, search_array);
        process.stdout.write('\n');
        console.log(count_location++);
        console.log(tweet_data);
        io.sockets.emit('twitter:statuses/filter', tweet_data);
    };
});
}
catch (e) {
    console.error("twitter.stream statuses/filter:",e)
}
stream_location.on('error', function(error) {
    console.log(error);
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/', Express.static(__dirname + '/../frontend'));

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
                var wget_options = {
                    query   : data.query,
                    date    : data.date,
                    print   : true
                };
                var csv_options = {
                    json : false,
                    date : data.date
                };
                wget(wget_options, function(results) {
                    var csv_data = extract_csv_data(results, csv_options)
                    console.log(csv_data);
                    var emit_data = {
                        data : csv_data, 
                        title : data.query,
                        date : data.date
                    };
                    client.emit('results', emit_data);
                });
                break;
            case 'Twitter':
                client.emit('alert', "Sorry! We are still in the process of integrating Twitter.");
                // do not change any of the param keys, these are sent directly to twitter
                var params = { 
                    q       : data.query,
                    lang    : 'en',
                    geocode : '54.26522,-3.95507,246mi',
                    count   : 100 
                };
                search_tweets(twitter, params, function(tweets) {
                    client.emit('twitter:search/tweets', tweets);
                });
                break;
            case 'All':
                client.emit('alert', "Sorry! We are still in the process of integrating Twitter, but here's the Google data!");
                console.log('Getting data from Google');
                var wget_options = {
                    query   : data.query,
                    date    : data.date,
                    print   : true
                };
                var csv_options = {
                    json : false,
                    date : data.date
                };
                wget(wget_options, function(results) {
                    var csv_data = extract_csv_data(results, csv_options)
                    console.log(csv_data);
                    var emit_data = {
                        data : csv_data, 
                        title : data.query,
                        date : data.date
                    };
                    client.emit('results', emit_data);
                });
        }
    });
});

server.listen(process.env.PORT || 3000);
