# mind-app

A web dashboard to track the status of keywords on Google Trends and Twitter. 

Mind-app gets data from Google Trends by authenticating using it's gmail account and `GET`ing a `CSV` of the data used to display the charts on Google Trends if a search with the same Timespan and Query are submitted on there. This `CSV` is parsed and the data extracted for storage and drawing the chart in the dashboard.

Mind-app gets data from Twitter using the API and accesses it at two endpoints:

* `statuses/filter` for stream
* `search/tweets` for search

## Frameworks/Libraries 
### Server

* Node - server
* Express - HTTP server
* Socket.io - communication with client
* Underscore - advanced utility functions
* LokiJS - in-memory JSON database
* Twit - Twitter API wrapper

### Dashboard
* Jquery - View rendering and controller
* Socket.io - communication with server
* Bootstrap - UI components stying and behaviour
* Google JavaScript API - drawing graphs
* Bootstrap-select - Selectable dropdowns
* Tooltipster - tooltips for UI components

# Guide

## Terminology

*Note: This guide is for a non-technical user. You are not required to be an advanced user to follow this guide.*

In this guide I will often use the word **shell**.  
If you are on Windows, this means **command prompt**.   
If you are on a UNIX-based OS (Mac OS X/Linux), this means **terminal**.

**server** refers to the back-end code, contained in the `./server` directory.  
**dashboard** refers to the front-end code, contained in the `./app` directory. This is what you see when you visit the page in a browser.

Many of the procedures in this guide require the running of commands in a shell. I will refer to this as **run** and it means: type the command into a the shell and press **Enter**.

### Formatting

`this` is a directory, filename, shell command  
[this]() is a link to a website  
**this** is a button or element to click on a website   
**[symbol]** describes an button or element where **symbol** describes it's symbol  

```
this is a code block or shell command
```

## Setup

Mind app is built on node-js (`node`) and will run in any environment with `node` and `npm` installed. Instructions to install `node` are [here](https://nodejs.org/en/download/package-manager). `npm` is included with `node` and instructions to install it are [here](http://blog.npmjs.org/post/85484771375/how-to-install-npm) and [here](https://docs.npmjs.com/getting-started/installing-node).

Once `node` and `npm` have been installed, install `forever` to keep the server running and restart if there are crashes. Do this by running

```
npm install -g forever
```

A walkthrough of running a basic `node` program in Windows can be found [here](http://blog.gvm-it.eu/post/20404719601/getting-started-with-nodejs-on-windows).

The structure of the code is:

```
./
+-- server/                 # Server-side code
    +-- cookies.txt         # wget cookies
    +-- keywords.txt        # Keyword list
    +-- mindapp.json        # Configuration file for forever to start and run server
    +-- package.json        # Configuration file for npm to build project 
    +-- twitter.js          # Twitter API wrapper
    +-- google_trends.js    # Custom Google Trends API
    +-- utilities.js        # Utility functions
    +-- server.js           # Main server script
    +-- data/               # Downloaded CSV files of Google Trends search data
    +-- db/                 # Production and Testing JSON databases 
    +-- logs/               # Log folder
        +-- out.log         # node output (console.log, stdout)
        +-- err.log         # node errors (console.error, stderr)
    +-- node_modules/       # Modules installed by npm
+-- app/                    # Client-side code
    +-- css/                # Style sheets
    +-- js/                 # Scripts run by page
        +-- controller.js   # Dashboard controller and main application logic
        +-- renderer.js     # Rendering functions
    +-- fonts/              # Fonts
    +-- index.html          # App landing page
+--README.md                # User guide and documentation
```
where `./` is the folder containing all the code (and this `README`).  

The command to start the server is 

```
forever start mindapp.json
``` 
If you are already in the `server` directory, run this command.

If you are in the top level directory (`./`) then run `cd ./server` to change the current directory to `server/` before running the forever command above.

There two files in the app that are user-editable and may require editing from time to time. These are `cookies.txt` and `keywords.txt`. 

## Access
### Hosting on a web server
To see the dashboard, visit the web server IP address/domain name (obtainable from the web host) and modify it so it looks like:

```
<server-ip-address>:3000
```

### Hosting locally
In your browser, go to:

```
localhost:3000
```

## Google Trends Authentication
`cookies.txt` contains cookies to access Google Trends and download CSV data. The cookies are authentication parameters passed with a web request that allows Google Trends to recognise a Google user has logged in and is trying to access the page. Without a Google user, there would be no Google authentication cookies so there is a Gmail account for this app which was used to get the cookies currently in use. The credentials for it are:

>username: "mind.app.0@gmail.com"  
>password: " mind app "

*Note: there are spaces in the password*

The cookies have long expiry dates (the earliest being 2017) but if the Google charts are not loading, it is most likely an authentication problem and the cookies need to be reset. To do so, you will need **Google Chrome** with an extension called [cookies.txt](https://chrome.google.com/webstore/detail/cookiestxt/njabckikapfpffapmjgojcnbfjonfjfg?hl=en).

### Updating the cookies

1. If there is already a `cookies.txt` in the app folder (*which there should be*), rename it to `cookies.old.txt` (*or something similar*) so it can easily be changed back in case something goes wrong in the cookies update process.
2. Go to [Google Trends](https://chrome.google.com/webstore/detail/cookiestxt/njabckikapfpffapmjgojcnbfjonfjfg?hl=en)
3. Sign in with the mind-app gmail account
4. Search for a keyword
5. Once you are on the page with the results chart, click the **cookies.txt** extension icon on the top right
6. Click the download link in the line:

	> \# This content may be [downloaded]() or pasted into a cookies.txt file and used by wget
7. Copy/move the downloaded cookies file (*it should be named `cookies.txt`*) to `./server` in the app
8. Load/refresh the page the app is running on in your browser
9. If the Google chart is does not load, navigate to `./server` with your shell and run `forever restartall` 

## Twitter Authentication

To access the Twitter data using the API, a Twitter account is required. The credentials for the mind-app Twitter account are identical to the Google credentials above.

It is possible Twitter may restrict access to the account (and therefore the API) if there is no user activity for a long period of time. If the Twitter stream *and* search are both not working, this is most likely the cause.

To regain access, go to Twitter and log in using the mind-app credentials.

## Twitter Search

Twitter has a fairly restrictive API for search which only returns a list of results that are 

* maximum 100 tweets
* less than a week old

Because of the second condition, when **Twitter** or **All** are selected under **Data Source**, **Timespan** defaults to **Last Week**.

**This presents some hinderances:** 
If a particularly active keyword is searched for, the Twitter results may only go back a few hours, if there have been 100 tweets in that timeframe. Conversely, if a fairly inactive keyword is searched, a graph with very few datapoints over a week will be returned (if at all - some keywords have no results that within a week, or at all).

## Twitter Stream Keywords

`keywords.txt` contains a list of words to search the Twitter stream. Each search term is on a new line and should be a single word (otherwise Twitter will search for any word in the line e.g. "problems relating to mental health" as will return any tweets containing the words "problems", "relating", "to", "mental", "health" - as you can see this will result in many topically-unrelated tweets). 

### Editing the keyword list

There are two methods for this:

* Edit `keywords.txt` directly:
	1. Add/remove keywords 
	2. Restart the server by running `forever restartall` in `./server`
* Add/remove keywords from the dashboard
	1. Click on the **Twitter Stream** dropdown 
	2. Use the **[plus]** button to add a keyword or select keywords to remove and click the **[minus]** button
	3. This will save the updated list to `keywords.txt` 

## Data Storage

This app does not use stored data for it's functionality other than `cookies.txt` and `keywords.txt`. However, to assist future development requiring historical data, all the data processed by the app is stored in `JSON` files functioning as a database in the `./db` directory. 

The database contains the full data of every processed tweet that is valid *(shown in the dashboard)* and every dataset used to render the charts, including the query that resulted in the graph.

## Unusual behaviour

You may one or more of the following:

##### When search button clicked, graph reloads, graph heading changes to Google (if not already), chart changes to showing trends for "mind"

There should be a popup stating there is no data for this query. If no data is recieved, the graph will reset to its defaults (how it is when the page is first loaded).

##### There are a lot of tweets in the stream arriving very frequently, most containing none of the keywords specified.

Ensure the keyword list does not contain any blank lines, or any unwanted keywords. The inputs for keyword list and search are protected against entering only spaces, but there are a variety of other characters that may cause this unusual behaviour.

##### A small red tag appears where the graph should be with text: 
> Data column(s) for axis \#0 cannot be of type string

The data to generate the chart is not in the expected format. This probably means Google or Twitter (depending on which graph performs this behaviour) is not returning data for the chart, which means there is an authentication problem. Follow the instructions in _Google Authentication_ and/or _Twitter Authentication_ above to resolve this.

*Note: If Twitter authentication has failed, both the Stream and the chart will not be updating.*

##### The green 'connected' labels have changed to red 'disconencted' labels and remained that way.
Run 

1. `forever restartall`
2. If it shows 

	```
	info:    No forever processes running
	```
	Run `cd ./server` then `forever start mindapp.json`
	which should output
	
	```
	warn:    --minUptime not set. Defaulting to: 1000ms
	warn:    --spinSleepTime not set. Your script will exit if it does 
	not stay up for at least 1000ms
	info:    Forever processing file: server.js
	```
	You can check by running `forever list` which should output:
	
	```
	info:    Forever processes running
	data:    uid         command script    forever pid    id logfile                                        	uptime      
	data:    [0] mindapp <path-to-node>/node server.js 316340  316352    
	<path-to-code>/server/logs/forever.log 0:0:3:5.252 
	```
