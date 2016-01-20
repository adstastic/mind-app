/* server.js */
/* Main script for the server*/

/* npm dependencies*/
var fs      = require('fs'),
    express = require('express'),
    _       = require('lodash');
    
/* custom dependencies */
var gtrends = require('./google_trends.js'),
    twitter = require('./twitter.js'),
    util = require('./utilities.js');
    
// Database collections
var GOOGLE = util.db.google,
    TWITTER_SEARCH = util.db.twitter_search,
    TWITTER_STREAM = util.db.twitter_stream,
    KEYWORDS = util.db.keywords;

var get_method;

// Prints error stack for uncaught process exceptions with timestamp
// REFERENCE http://debuggable.com/posts/node-js-dealing-with-uncaught-exceptions:4c933d54-1428-443c-928d-4e1ecbdd56cb
process.on('uncaughtException', function (e) {
  console.log(new Date().toISOString(), e.stack || e);
  process.exit(1);
});

// checks command line arguments for whether to use wget or curl 
// REFERENCE https://docs.nodejitsu.com/articles/command-line/how-to-parse-command-line-arguments
function check_command_line_arguments() {
	// process command line process arguments
	process.argv.forEach(function (val, index, array) {
    	if (array[2] == 'wget') {
    	    get_method = 'wget';
    	    console.log("Using wget for google trends");
    	} else {
    	    console.log("Defaulting to use cURL for google trends");
    	    get_method = 'curl';
    	}
	});
}

// in case server script is started from a different directory than server/, this changes the current working directory to that containing server
// preserves relative filepaths used in script for file IO
// REFERENCE https://nodejs.org/api/process.html#process_process_chdir_directory
function change_to_file_directory() {
    try {
      process.chdir(__dirname);
      console.log('Current directory: ' + process.cwd());
    }
    catch (err) {
      console.log('chdir: ' + err);
    }
}

check_command_line_arguments();
change_to_file_directory();


var app = express();
// enables cross origin requests on webserver 
// REFERENCE http://enable-cors.org/server_expressjs.html
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Serves app directory to webserver
// REFERENCE http://expressjs.com/en/starter/static-files.html
app.use('/', express.static(__dirname + '/../app'));

// creates HTTP server for express app so it can be used with socket.io
// REFERENCE http://socket.io/docs/#using-with-express-3/4
var server = require('http').createServer(app),
    io = require('socket.io')(server);

// reads keywords string from file
var search_terms_from_file = fs.readFileSync('./keywords.txt', 'utf8');
// splits keyword string into array or if undefined, splits default keyword string in twitter module to array
var search_array = search_terms_from_file.split('\n').sort() || twitter.search_terms.split(',').sort();
console.log('Search_array: ',search_array);

// Twitter stream and counters for incoming tweets
var stream = twitter.stream();
var count_valid = 0;
var count = 0;

// Processes incoming tweets in stream 
// REFERENCE https://github.com/ttezel/twit
try {
    stream.on('tweet', function(tweet) {
        count++;
        if (twitter.process_tweet(tweet, search_array)) {
            util.save_db(TWITTER_STREAM, tweet); 
            var tweet_data = twitter.process_tweet(tweet, search_array);
            console.log("Matched tweet #%d | Streamed tweet #%d", count_valid++, count);
            console.log(_.toPairs(tweet_data).toString());
            io.sockets.emit('twitter:statuses/filter', tweet_data);
        }
    });
}
catch (e) { // error handling for tweet processing at server
    console.error("twitter.stream statuses/filter:",e);
}

// error handling for stream
// REFERENCE https://github.com/ttezel/twit
stream.on('error', function(error) {
    console.log(error);
});

// all client communication happens in this block - each client has its events processed separately as the functions in the block all deal with a client object
// see app/controller.js for the other side of these events
// REFERENCE http://socket.io/docs/server-api/#
io.on('connection', function(client) {
    console.log('Client '+ client.id + ' connected.');
    
    // send keyword list to client
    client.emit('stream_keywords', search_array);
    
    // prints any data sent from client on joining the socket, sends hello back
    client.on('join', function(data) {
        console.log(data);
        client.emit('messages', 'hello from server');
    });
    
    // when client requests stream keywords, sends keyword array 
    client.on('stream_keywords', function() {
        client.emit('stream_keywords', search_array);
    });
    
    // adds keyword from client to keyword array and sends back
    // writes keyword array to db (to keep record of change)
    // parses array to string and writes to keyword file (keyword file is designed to be user editable to enable adding keywords in bulk)
    client.on('keyword_add', function(data) {
        console.log('keyword add: ', data);
       search_array.push(data);
       client.emit('stream_keywords', search_array);
       util.save_db(KEYWORDS, search_array);
       util.write_file('./keywords.txt', search_array.join("\n"));
    });
    
    // same as keyword add but on keyword removal at client side
    client.on('keyword_remove', function(data) {
        search_array = _.difference(search_array, data);
        client.emit('stream_keywords', search_array);
        console.log(search_array.join("\n"))
        util.save_db(KEYWORDS, search_array);
        util.write_file('./keywords.txt', search_array.join("\n"));
    });
    
    // Resets keyword array to default in twitter module and sends back
    client.on('keyword_reset', function() {
        search_array = twitter.search_terms.split(',');
        client.emit('stream_keywords', search_array);
    });
    
    // If connection closed
    client.on('disconnect', function(data) {
        console.log('Client '+ client.id + ' disconnected.');
    });
    
    // processes search query from client
    client.on('search', function(data) {
        console.log('Search from client: ', data);
        // data source requested
        switch (data.data) {
            // each of the cases invoke functions in the required module to process the query and get a response
            // if responses are valid, sends to client and writes to db
            case 'Google Trends':
                // google_trends module processes query and invokes callback 
                gtrends.response(get_method, data, function(emit_data, save_data) {
                    // checking for valid inputs before sending to client
                    if (emit_data) client.emit('results', emit_data);
                    if (save_data) util.save_db(GOOGLE, save_data);
                    else {
                        client.emit('alert', "Sorry, there seem to be no results for that query!")
                        client.emit('reset');
                        console.log('[res_google] unexpected response');
                    }
                });
                break;
            case 'Twitter':
                // twitter module processes query and invokes callback 
                twitter.response(data, function(emit_data, save_data) {
                    if (emit_data) client.emit('twitter:search/tweets', emit_data);
                    if (save_data) util.save_db(TWITTER_SEARCH, save_data);
                    else {
                        client.emit('alert', "Sorry, there seem to be no results for that query!")
                        client.emit('reset');
                        console.log('[res_twitter] unexpected response');
                    }
                });
                break;
            case 'All':
                // same control flow as cases for twitter and google trends, but does them both
                console.log('Getting data from Google and Twitter');
                // variables specified in enclosing scope because twitter.response and gtrends.response will complete at different times both datasets are required to render data correctly at client side
                var g, t; 
                twitter.response(data, function(emit_data, save_data) {
                    if (emit_data) {
                        t = emit_data;
                        client.emit('All:Twitter', { google: g, twitter : t});
                    }
                    if (save_data) util.save_db(TWITTER_SEARCH, save_data);
                    else {
                        client.emit('alert', "Sorry, there seem to be no results for that query!")
                        client.emit('reset');
                        console.log('[res_twitter] unexpected response');
                    }
                });
                gtrends.response(get_method, data, function(emit_data, save_data) {
                    if (emit_data) {
                        g = emit_data;
                        client.emit('All:Google', { google: g, twitter : t});;
                    }
                    if (save_data) util.save_db(GOOGLE, save_data);
                    else {
                        client.emit('alert', "Sorry, there seem to be no results for that query!")
                        client.emit('reset');
                        console.log('[res_twitter] unexpected response');
                    }
                });
        }
    });
});

// if environment variable PORT specified when server is run, listens there, otherwise defaults to 3000
server.listen(process.env.PORT || 3000);