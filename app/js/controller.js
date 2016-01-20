/* controller.js */
/** Front-controller for app */
/* global google, io, render */
google.load("visualization", "1", {packages:["corechart"]});

$(function() {
  // socket.io for client-server communication
  // to see the other side of the socket.io messages, go to server/server.js
  var socket = io.connect();
  
  // counters for tweets and seconds since last tweet
  var secs = 0,
      tweets = 0;
  
  // increments counter for seconds
  // REFERENCE https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setInterval
  setInterval(function() {
    $('#twitter').find('.waiting').html('Waiting '+secs+'s');
    secs++;
  }, 1000);
  
  // convert select divs into selectpickers
  $('.selectpicker').selectpicker({
    style: 'btn-default',
  });
  
  // hide keyword add div
  $('#keyword_add').hide();
  
  // add tooltips to divs
  $('.tool-tip').tooltipster({ 
    theme : 'my-tooltip-theme',
    timer : 3000
  });
  
  // add special tooltip for google trends chart
  $('#relative-interest').tooltipster({ 
    theme : 'my-tooltip-theme',
    timer : 10000,
    content: $("<p>Google's 'relative interest' statistic is defined as:</p> <q>Numbers represent search interest relative to the highest point on the chart. If, at most ,10% of searches for the given region and time frame were for 'pizza', we'd consider this 100. This doesn't convey absolute search volume.</q>")
  });
  
  render.on_load(secs);
  render.graph_loading();
  
  // detect enter keypress and simulate clicking submit button depending on which textfield has keyboard focus
  $(document).keypress(function(e) {
      if(e.which == 13) {
          console.log('Enter pressed!');
          if ($('#search').is(':focus')) {
            submit_click();
          } else if ($('#keyword_add input').is(':focus')) {
            submit_keyword();
          } else console.log('No text input in focus');
      }
  });
  
  // default search to submit for chart to show on load
  var params_onload = {
          query : 'Mind',
          data  : 'Google Trends',
          date  : 'Last Hour'
        };
        
  // client-server communication
  socket.on('connect', function(data) {
    socket.emit('join', 'hello from client ');
    console.log('Client connected to server');
    
    render.on_connect();
  
    socket.emit('search', params_onload);
  });
  
  socket.on('reset', function() {
    socket.emit('search', params_onload);
  })
  socket.on('messages', function(data) {
    console.log(data);
  });
  
  socket.on('disconnect', function(data) {
    console.log('Client disconnected from server');
    socket.io.reconnect();
  });
  
  // process google trends result
  socket.on('results', function(data) {
    console.log("google\n",data.data.toString());
    render.draw_google(data, render.add_chart_URI);
  });
  
  // process twitter stream result
  socket.on('twitter:statuses/filter', function(data) {
    console.log(data);
    if(data.text.length > 0) {
      tweets++;
      render.draw_tweet(data);
      secs = 0;
    }
  });
  
  // process twitter search result
  socket.on('twitter:search/tweets', function(data) {
    console.log('twitter:search/tweets\n',data);
    console.log('emptied chartURI');
    render.draw_twitter(data, render.add_chart_URI);
  });
  
  // on alert from server display alert to user
  socket.on('alert', function(data) {
    alert(data);
  });
  
  // container for google and twitter data when displaying all charts
  var all = {};
  
  // depending on which of the methods finishes first, one of the responses will arrive with the other dataset missing
  // the following code checks the data in the message to see if both google and twitter variables are present
  // if not, the second arriving response will contain them both as it finished later
  socket.on('All:Twitter', function(tdata) {
    render.prep_graphs();
    if (tdata.google) {
      all.google = tdata.google;
    }
    if (tdata.twitter) {
      all.twitter = tdata.twitter;
      render.drawChart(all.twitter, 'graph2', 200, 'Twitter', render.add_chart_URI);
    }
    console.log("All:Twitter",all);
  });
  
  socket.on('All:Google', function(gdata) {
    render.prep_graphs();
    if (gdata.google) {
      all.google = gdata.google;
      render.drawChart(all.google, 'graph1', 200, 'Google Trends', render.add_chart_URI);
    }
    if (gdata.twitter) {
      all.twitter = gdata.twitter;
    }
    console.log("All:Google",all);
  });
  
  // refresh keyword list
  socket.on('stream_keywords', function(data) {
    console.log(data);
    render.refresh_keywords(data);
  });
  
  socket.on('disconnect', function() {
    render.on_disconnect();
  });
  
  // when stream keyword list clicked, check if empty and populate
  $('#stream').click(function() {
    if ($('#stream').children().length === 0) {
      socket.emit('stream_keywords');
    }
  });
  
  // handles search submit button click
  $('#submit').click(submit_click);
  
  // swaps stream list with keyword add view
  $('#add').click(function() {
    console.log('add clicked');
    $('#keyword_view').hide();
    $('#keyword_add').show();
  });
  
  // sends selected stream keywords to server for removal from list
  $('#remove').click(function() {
    console.log('remove clicked');
    if ($('#stream').val()) {
      console.log('keyword removed: ',$('#stream').val());
      socket.emit('keyword_remove', $('#stream').val());
    } else {
      alert('Please select a keyword to remove from the list.');
    }
  });
  
  // resets twitter stream keyword list to default
  $('#reset').click(function() {
    console.log('reset clicked');
    socket.emit('keyword_reset');
  });
  
  
  
  // takes text from keyword submit box and sends to server on keyword submit button click
  $('#keyword_submit').click(submit_keyword);
  
  // disables time dropdown and selects 'Last week' if 'Twitter' or 'All' are selected in data dropdown
  $('#data').change(function() { 
    var selected = $('#data').val();
    console.log('data source change');
    switch (selected) {
      case "Twitter":
        console.log("case twitter");
        $('#time').prop("disabled", true);
        $('#time').val("Last Week");
        $('#time').selectpicker('refresh');
        break;
      case "Google Trends":
        $('#time').removeAttr("disabled");
        $("#time option").prop("selected", false);
        $('#time').selectpicker('refresh');
        break;
      case "All":
        $('#time').prop("disabled", true);
        $('#time').val("Last Week");
        $('#time').selectpicker('refresh');
        break;
    }
  });
  
  // export PDF or image button event handler
  $('#export').change(function() { 
    var selected = $('#export').val();
    switch(selected) {
      case "PDF": 
        render.export_pdf(render.get_chart_URI());
        break;
      case "Image":
        render.image_window(render.get_chart_URI());
        break;
    }
    $('#export').val('Export');
    $('#export').selectpicker('refresh');
  });
 
// extracts search query and sends to server
function submit_click() {
  render.reset_chart_URI();
  var query = $('#search').val(),
      data  = $('#data').val(),
      time  = $('#time').val();
    
  if (query.trim().length > 0 && data.trim().length > 0 && time.trim().length > 0) {
    render.graph_loading(render.which_shown('#graph', '#graphs'));
  
    var params = {
      query : query,
      data  : data,
      date  : time
    };
    
    console.log('Submitting params to server ', params);
    socket.emit('search', params);
  } else {
    alert('Whoops! Looks like you forgot to enter something. Make sure Data Source, Time Scale and Search are all filled out!');
  }
}

// submits keyword for addition to server
function submit_keyword() {
  var kw = $('#keyword_add input').val();
  if (kw.trim().length > 0) {
    console.log('keyword added: '+kw);
    socket.emit('keyword_add', kw);
    $('#keyword_add').hide();
    $('#keyword_view').show();
  } else {
    alert("Please enter a keyword to add!");
  }           
}


});