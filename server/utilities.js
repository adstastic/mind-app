/* utilities.js */
/* Utility functions */
var loki = require('lokijs'), // JSON database lokijs.org/
    fs      = require('fs'); // node built-in filesystem module

var date = new Date();
var filepath = './db/mindapp_db.json'; // main db
var testpath = './db/test_db.json'; // test db
var DB = new loki(filepath); 

// All code relating to LokiJS is referenced to the documentation
// REFERENCE http://lokijs.org/#/docs
try {
    // load db from file
    var db_json = fs.readFileSync(filepath, {
        encoding: 'utf8'
    });
    DB.loadJSON(db_json);
    console.log("[DB] Loaded from file: ", filepath);
    console.log("[DB] Added collections");
    console.log(DB.listCollections()); 
} catch (e) {
    // if error, create new DB and save with current timestamp in filename
    console.error("loki.loadDatabase:", e.stack);
    var dbpath = "./db/"+date.toISOString()+"_db.json";
    DB = new loki(dbpath);
    console.log("[DB] Created new DB: ", dbpath);
}

// LokiJS persistence API not working so adding new collection for required data on each restart of server 
var TWITTER_STREAM = DB.addCollection('twitter_stream'),
    TWITTER_SEARCH = DB.addCollection('twitter_search'),
    GOOGLE = DB.addCollection('google'),
    KEYWORDS = DB.addCollection('keywords');
    
console.log("[DB] Added collections");

// module functions
module.exports = {
    read_file : function(outfilename, callback) {
    	fs.readFile(outfilename, 'utf8', function (err,data) {
    	  	if (err) {
    	    	return console.log(err);
    	  	}
            console.log("read data from "+outfilename);
      		callback(data);
      	});
    },

    write_file : function(filename, data) {
        fs.writeFile(filename, data, 'utf8', function (err,data) {
          if (err) {
            return console.error('[write_file]', err.stack);
          }
          console.log('[write_file] ', data);
        });
    },
    // save db to file
    save_db : function(collection, data) {
        try { 
            collection.insert(data);
            DB.saveDatabase(); 
            console.log("Saved DB to file")
        }
        catch(e) { console.error("DB.saveDatabase", e || e.stack); 
        }
    },
    
    // object with references to db collections for use when invoking save_db in other files
    db : {
        google: GOOGLE,
        twitter_search: TWITTER_SEARCH,
        twitter_stream: TWITTER_STREAM,
        keywords : KEYWORDS
    }
}