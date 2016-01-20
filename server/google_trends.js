/* google_trends.js */
/* Library for getting data from google trends */
/* npm dependencies*/
var request = require('request'),
    fs      = require('fs'),
    exec    = require('child_process').exec,
    curl    = require('curlrequest'),
    sprintf = require("sprintf-js").sprintf;

/** Adding function stripSlashes to String to remove '\' from JSON Strings */
String.prototype.stripSlashes = function(){
    return this.replace('\\"', '\"');
};

// regex to parse data from csv
// REFERENCE http://regexr.com/
var regex_day_hour = /\d{4}-\d{2}-\d{2}-\d{2}:\d{2}\s\w{3},\d+/gm,
    regex_month = /\d{4}-\d{2}-\d{2},\d+/gm,
    regex_year = /\d{4}-\d{2}-\d{2}\s-\s\d{4}-\d{2}-\d{2},\d+/gm;

// returns google URL syntax for date option specified in client request and corresponding csv parsing regex
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

// Extracts lines from CSV and parses into format for drawing chart
function extract_csv_data(data, options, callback) {
    console.log('options ', options)
    var regex = date_dict[options.date][1]; 
    var values = data.match(regex); //splits data into array by line
    try {
        for (var i=0; i<values.length; i++) {
            var line = values[i].split(/[\s,:-]+/); //splits line into date, value
            var year    = line[0],
                month   = line[1]-1,
                day     = line[2];
            var date = new Date(year, month, day);
            if (line[3].length == 2) { // if line has hour and minute fields, add to date
                date.setHours(line[3]); 
                date.setMinutes(line[4]);
            }
            
            var value = line[line.length-1];
            
            values[i] = [date.toISOString(), parseFloat(value)];
        }
        values.unshift(['time', 'relative interest']); // add element to beginning of array - column headers for chart data
        if (options.json) {
            values = JSON.stringify(values, null, 2);
        }
        if (typeof callback ==  "function") {
            callback(values);      
        } else return values;
    }
    catch(e) {
        console.error("extract_csv_data:",e.message);
    }
}
// converts google trends response to JSON object when using google trends JSON URL
function response_to_json(data) {
    /* Read HTTP response data and parse to JSON */
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

module.exports = {
    
    self: this,
    // fetch JSON from google trends URL (blocks IP after 25 attempts within 24 hours)
    fetch_json: function(callback) {
    	// fetch from data sources
        var url = 'http://www.google.com/trends/fetchComponent?q=als,ice%20bucket%20challenge&cid=TIMESERIES_GRAPH_0&export=3';
            request({
                url: url,
                json: true,
            }, function(error, response, body) {
                    if(!error){
                        callback(body);
                    }
                }
            );
        },
    // saves json object to file
    save_json: function(json_obj, outfilename) {
      	var outfile = outfilename+'.json';
      	fs.writeFile('./'+outfile, JSON.stringify(json_obj, null, 2), function(err) {
        	if (err) throw err;
          	console.log("Saved JSON string to "+outfile);
      	});
    },
    // uses wget to get google trends CSV
    // REFERENCES https://www.gnu.org/software/wget/manual/html_node/HTTP-Options.html
    wget : function(options, callback) {
        var filename;
        // spawns child process to execute wget
        function execute(cmd, callback) {
            console.log('[execute] '+cmd);
            try {
            exec(cmd, function (error, stdout, stderr) {
                if (stdout) console.log('[exec] stdout: ' + stdout);
                if (stderr) console.log('[exec] stderr: ' + stderr);
                if (error !== null) {
                  console.log('[exec] error: ' + error);
                }
                if (typeof callback == "function") {
                    callback(stdout);
                } 
            });
            }
            catch (e) {
                console.error("[wget > execute]",e);
            }
        }
        
        // process query and parses into URL
        if (options.query && options.date) {
            var query = options.query.trim().replace(" ", "+"), // remove leading and trailing whitespace, replace space with '+'
                date = date_dict[options.date][0]; 
            var URL = 'https://www.google.co.uk/trends/trendsReport\?hl\=en-GB\\&q\='+query+'\\&geo\=GB\\&date\='+date+'\\&cmpt\=q\\&tz\=Etc%2FGMT\\&tz\=Etc%2FGMT\\&content\=1\\&export\=1';
            var cmd;
            if (options.print) { // print to stdout (redirect to console)
                cmd = 'wget -x --load-cookies ./cookies.txt -O - -o /dev/null '+ URL;
            } else { 
                if (options.filename) {
                    filename = options.filename;
                } else { // set filename with datetime and search params
                    filename = sprintf("%s-%s.%s.csv", query, options.date, this.pretty_timestamp());
                }
                cmd = 'wget -x --load-cookies ./cookies.txt -O "'+filename.toString() +'" '+ URL;
            }
            execute(cmd, callback);
        }
        
    },
    // alternative to wget - uses cURL to get CSV data - cookies are contained in body of function here 
    // REFERENCE https://github.com/chriso/curlrequest
    curl : function(search, callback) {
        if (search.query && search.date) {
            var query = search.query.trim().replace(" ", "+"), // remove leading and trailing whitespace, replace space with '+'
                date = date_dict[search.date][0];
            var options = {
                url: 'https://www.google.co.uk/trends/trendsReport?hl=en-US&q='+query+'&geo=GB&date='+date+'&tz=Etc%2FGMT&content=1&export=1',
                headers: {
                    dnt: 1, 
                    'accept-encoding' : 'gzip, deflate, sdch', 
                    'accept-language' : 'en-US,en;q=0.8',
                    'upgrade-insecure-requests' : 1,
                    'user-agent'  : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
                    accept  : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    referer : 'https://www.google.co.uk/trends/explore', 
                    authority   : 'www.google.co.uk',
                    cookie  : '__utmt=1; __utma=174189748.1310709412.1453107210.1453107210.1453107210.1; __utmb=174189748.1.10.1453107210; __utmc=174189748; __utmz=174189748.1453107210.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); I4SUserLocale=en_US; DV=AqBvrfIid84SpH3lGaNxj3RD3N2npAI; NID=75=Pbrm_dx0M8mO-PScd6UoDJ7CW6e7TAnmnxSEvujE5omi7bKP6JRThdZVNLFZwgBUtstJlGaT8ObvXtP_tWbHZnRbTgYDRhxL0dnBv9r9qDS07uCXTYQ8RzXiHasJYR2HmvgscNuDooN-SlImtWSMJBImZ8Ac6-9GcXC1; SID=DQAAAP8AAADgojQHtoLOzZt78aB9SPHgIIzvbaeRWwSuLB-B2ZBPWHQwk7Noq2s7BJktD3tPArruw_iGcahg8yYx0lEiqaFjyRNolrJm_429TwMX95tqGTxX71yJAcNKFvcBOgflwXpfF3svQzbFNQhF3oh6-Y1XWmH8GHAcm2PwI31Q4Nx1oVh807BCvjHVfoJqh1Wzj2fj0a4wP3TpS5SS9TVHIlOwWApYv2m9I8qfw_IF6HkBCIkeL2jWLF_uJY25zh8M_Qfh3_RzLtru4hlKi2hk8JlwMRvKZjckbxCugE0z2EESbZK4T3kVRSacF7x7533Is30lTM-nt8kd1wB-JVVplQQn; HSID=Ale4hAMJgtFDagvad; SSID=ANz0EYU3lrbOynVL4; APISID=nbvTnBdY6aMNPp00/ADTY5mkTltykgFUB_; SAPISID=j0Z6uPpr-RD-gEze/Az6oDmx8gMtnpj0EV; CONSENT=YES+GB.en+20151207-13-0; S=izeitgeist-ad-metrics=l4ZavYDZVBM',
                },
                compressed  : true,
                verbose : true,
                stderr  : true
            };
            curl.request(options, function(err, data) {
                if (err) console.err(err);
                if (data) {
                    console.log('CURL ',data.toString());
                    callback(data);
                }
            })
        } else console.log('[gtrends.curl] invalid options');
    },
    // Adds leading 0's to all date params and concat's to last 2 characters to ensure 2 digit output
    pretty_timestamp: function() {
        var d = new Date();
        var second = ('0' + d.getSeconds()).slice(-2),
            minute = ('0' + d.getMinutes()).slice(-2),
            hour = ('0' + d.getHours()).slice(-2),
            day = ('0' + d.getDay()).slice(-2),
            month = ('0' + d.getDay()+1).slice(-2), // js months are indexed from 0
            year = d.getFullYear();
        var formatted_date = sprintf('%s-%s-%s.%s:%s:%s', day, month, year, hour, minute, second);
        return formatted_date;
    },
    // handles query from server.js and sends response using functions in this module
    response: function(method, data, callback) {
        console.log('Getting data from Google');
        var search = {
            query   : data.query,
            date    : data.date,
            print   : true
        };
        var csv_options = {
            json : false,
            date : data.date
        };
        // selects between wget and curl 
        if (method == 'wget') this.wget(search, get_csv);
        else if (method =='curl') this.curl(search, get_csv);
        
        // callback for curl and wget to return CSV response to server
        function get_csv(results) {
            var csv_data = extract_csv_data(results, csv_options);
            console.log("CSV data:", csv_data.toString());
            if (csv_data[1]) {
                var emit_data = {
                    data : csv_data, 
                    title : data.query,
                    date : data.date,
                    source : data.data
                };
                var save_data = { 
                    timestamp : new Date().toISOString(),
                    query : data,
                    result : csv_data
                };
                callback(emit_data, save_data);
            } else {
                callback();
            }
        }
    }
    
}