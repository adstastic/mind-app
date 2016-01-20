/* twitter.js */
/* Library for Twitter endpoints statuses/filter and search/tweets */
/* npm dependencies */
var twit = require('twit'), // Twitter API wrapper https://github.com/ttezel/twit
    _    = require('lodash'); // useful utility functions https://lodash.com/

// Authentication for twitter API access
// see README for instructions on how to access the Twitter account associated with these credentials
var tAPI = new twit({
    consumer_key : 'ITCesj8sCEcBNPXh5PvRT2GMy',
    consumer_secret : 'ue5Tkxt9pbXpsjQrT8kNtpUek5sakHxjceiCqcDKBpTIujugEj',
    access_token : '4764679471-FzxbWcIEbteijeNLaeqrhsgPqQsO50OoML3SXsz',
    access_token_secret : 'q2Feq9bMVx0rvqWooX6NhpjIsF4ArCywziVMTBrUfiC5m'
});

// Geographic bounding box for UK - used to filter stream to tweets originating in region specified
var uk = ['-9.05', '48.77', '2.19', '58.88'];
// default string of stream keywords, converted to array and sent to client if list is reset at client side
var search_terms = "mindcharity,mentalhealth,Abuse,Addiction,dependency,Advocacy,Aftercare,Anger,Antidepressants,Antidepressants,Antipsychotics,Anxiety,panic attacks,Arts therapies,Benefits,Bereavement,Bipolar disorder,Body dysmorphic disorder,Borderline personality disorder,BPD,Carers,coping,Clinical Negligence,Cognitive behavioural therapy,CBT,Community care,aftercare,mental health,social care,Complementary therapy,alternative therapy,Consent to treatment,CRHT,Crisis services,Debt and mental health,Depression,Dialectical behaviour therapy ,Disability discrimination,Discharge from hospital,Discrimination at work,Dissociative disorders,Driving,Drugs - street drugs & alcohol,Eating problems,Ecotherapy,Electroconvulsive therapy,Financial help,Hearing voices,Hoarding,Holidays and respite care,Housing,Human Rights Act 1998,Hypomania and mania,IMHAs (England),IMHAs (Wales),Insurance cover and mental health,Learning disability support,LGBT mental health,Lithium and other mood stabilisers,Loneliness,Medication,Medication - drugs A-Z,Medication - stopping or coming off,Mental Capacity Act 2005,Mental Health Act 1983,Mental health and the courts,Mental health and the police,Mental health problems,Mindfulness,Money and mental health,Nearest relative,Neurosurgery for mental disorder,Obsessive-compulsive disorder,ocd,Online safety and support,Panic attacks,Paranoia,Parenting with a mental health problem,Peer support,Personal budgets,Personal information,Personality disorders,Phobias,Physical activity,Postnatal depression,Post-traumatic stress disorder,ptsd,Psychosis,Relaxation,Schizoaffective disorder,Schizophrenia,Seasonal affective disorder,Sectioning,Seeking help for a mental health problem,Self-esteem,Self-harm,Sleep problems,Sleep problems,Sleeping pills,tranquillisers,St John's wort,mental health statistics,mental health facts,Stress,Student life,Suicidal feelings,Suicide,Talking treatments,Tardive dyskinesia,Wellbeing,emergency services";

// variables available when this file is added as a module
module.exports = {
    // search a string for items contained in an array
    // returns boolean so can be used as truth test 
    search: function(string, keywords) {
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
            console.error("search:",e);
        }
        return found;
    },
    
    // searches tweet for keywords in search array and if contained, extracts required parameters and returns object containing them
    // REFERENCE https://github.com/ttezel/twit
    // function execution timing code (console.time statements) commented out - useful to see how performance changes as the size of the search array increases
    // REFERENCE https://nodejs.org/api/console.html#console_console_time_label
    process_tweet : function(tweet, search_array) {
        // console.time('process_tweet');
        if (this.search(tweet.text.toLowerCase(), search_array)) {
            var location = ((tweet.place.country) ? tweet.place.country : tweet.user.location);
            var tweet_data = { user: tweet.user.name, text : tweet.text, location : location , created_at : tweet.created_at };
            // console.timeEnd('process_tweet');
            return tweet_data;
        } else return null; 
    },
    
    // submits search parameters to twitter API search/tweets endpoint
    search_tweets : function(params, callback) {
        try {
            // submit search params to Twitter API
            // extracts required tweet parameters
            // REFERENCE https://dev.twitter.com/rest/reference/get/search/tweets
            tAPI.get('search/tweets', params, function (twitter_err, data, response) {
                var subset = data.statuses;
                if (twitter_err) throw twitter_err;
                var tweets = [];
              	for (var status in subset) {
              	    status = subset[status];
              	    status = { 
              	        created_at  :   new Date(status.created_at).toISOString(),
              	        id          :   status.id,
              	        place       :   (status.place || status.user.location),
              	        text        :   status.text,
              	        hashtags    :   status.entities.hashtags
              	    };
              	    tweets.push(status);
              	}
                // chaining _ functions to filter and group array
                // REFERENCE https://lodash.com/docs#groupBy
                // groups search response into tweets by day of week, then by hour of day 
              	var tweets_week = _.chain(tweets)
                    .groupBy(function(tweet){
                        var date = new Date(tweet.created_at); 
                        return date.getDate();
                    })
                    .map(function(tweets_day) { 
                        return _.groupBy(tweets_day, function(tweet) {
                            var date = new Date(tweet.created_at); 
                            return date.getHours();
                        });
                    })
                    .value();
                var tweets_enumerated = [];
                // count number of tweets in a given hour and push time and number to array
                tweets_enumerated.push(['time', 'tweets']);
                for (var tweets_day in tweets_week) { 
                    var day_tweets = tweets_week[tweets_day]; 
                    for (var tweets_hour in day_tweets) { 
                        var hour_tweets = day_tweets[tweets_hour]; 
                        var date = hour_tweets[0].created_at; 
                        var num = hour_tweets.length; 
                        tweets_enumerated.push([date, num]); 
                    }
                }
                console.log('[process_tweets] ', tweets);
                callback(tweets_enumerated);     
            });
        }
        catch (e) {
            console.error("twitter.get search/tweets:",e);
            return null;
        }
    },
    /* Twitter stream for geolocation bounding box around UK */
    stream : function() {
        return tAPI.stream('statuses/filter', { locations: uk });
    },
    // handles search requests to twitter from server.js using other functions in this module
    response : function(data, callback) {
            // do not change any of the param keys, these are sent directly to twitter
            var twitter_params = { 
                q       : data.query,
                lang    : 'en',
                geocode : '54.26522,-3.95507,246mi',
                count   : 100 
            };
            this.search_tweets(twitter_params, function(tweets) {
                if (tweets[1]) {
                    var emit_data = {
                        data : tweets, 
                        title : data.query,
                        date : data.date,
                        source : data.data
                    };
                    var save_data = { 
                        timestamp : new Date().toISOString(),
                        query : data,
                        result : tweets
                    };
                    callback(emit_data, save_data);
                }
                else {
                    callback();
                }
            });
            
        }
    
}