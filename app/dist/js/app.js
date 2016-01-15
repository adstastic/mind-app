/*global google*/
google.load("visualization", "1", {packages:["corechart"]});

$(function() {
  var secs = 0,
      tweets = 0;
  /*global io*/
  var socket = io.connect();
  $('.tool-tip').tooltipster({ 
    theme : 'my-tooltip-theme',
    timer : 3000
  });
  
  var date = new Date();
  var date_string = date.getDate() + "/" + date.getMonth()+1 + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
  $('#google').find('.login').html('Page Loaded at ' + date_string);
  graph_loading();
  setInterval(function() {
      $('#twitter').find('.waiting').html('Waiting '+secs+'s');
      secs++;
    }, 1000);
  $('.selectpicker').selectpicker({
    style: 'btn-default'
  });
  $('#keyword_add').hide();
  
  // detect enter keypress and simulate clicking submit button
  $(document).keypress(function(e) {
      if(e.which == 13) {
          console.log('Enter pressed!');
          submit_click();
      }
  });
  
  /*global drawChart*/
  function drawChart(res, div, height, source) {
    
    var date_dict = {
        'Last Hour' : 'dd/MM/yy hh:mm',
        '4h' : 'dd/MM/yy hh:mm',
        'Last Day' : 'dd/MM/yy hh:mm',
        'Last Week' : 'dd/MM/yy hh:mm',
        'Last Month' : 'dd/MM/yy',
        '3m' : 'dd/MM/yy',
        'Last Year' : 'dd/MM/yy',
        'All Time' : 'dd/MM/yy'
    };  
    
    var colors;
    switch (source) {
      case "Google Trends": 
        colors = ['#003377'];
        break;
      case "Twitter": 
        colors = ['#00cd7f'];
        break;
    }
    
    console.log(res.data);
    for (var i=1; i<res.data.length; i++) {
      res.data[i][0] = new Date(res.data[i][0]);
    }
    
    // this new DataTable object holds all the data
    var data = new google.visualization.arrayToDataTable(res.data);
    // this view can select a subset of the data at a time
    var view = new google.visualization.DataView(data);
    view.setColumns([0,1]);
  // set chart options
    var options = {
        width: 800, 
        height: height,
        title: 'Social Media Trends for '+res.title+' over '+res.date.toLowerCase()+' from '+source,
        titleTextStyle : {color: '#003377', fontSize: 21, fontName : 'Tahoma'},
        colors: colors,
        legend: {position: 'right', textStyle: {color: '#003377', fontName: 'Tahoma'}},
        hAxis: {
          title: data.getColumnLabel(0), 
          minValue: data.getColumnRange(0).min, 
          maxValue: data.getColumnRange(0).max, 
          textStyle: {color: '#003377', fontName: 'Tahoma'}, 
          titleTextStyle: {color: '#003377'},
          format: date_dict[data.date]
        },
        vAxis: {
          title: data.getColumnLabel(1), 
          minValue: data.getColumnRange(1).min, 
          maxValue: data.getColumnRange(1).max, 
          textStyle: { color: '#003377', fontName: 'Tahoma'}, 
          titleTextStyle: {color: '#003377'}
        },
        explorer : ['dragToPan','dragToZoom','rightClickToZoom']
    };
    // create the chart object and draw it
    var chart_div = document.getElementById(div);
    var chart = new google.visualization.LineChart(chart_div);
    google.visualization.events.addListener(chart, 'ready', function () {
        console.log(chart.getImageURI());
      });
    chart.draw(view, options);
  
  }
  
  function graph_loading(div) {
    $('#google').find('.status').removeClass('label-success');
    $('#google').find('.status').addClass('label-warning');
    $('#google').find('.status').html('Loading');
    $(div).hide();
    $('#tout').show();
  }
  
  function graph_ready(div) {
    $('#google').find('.status').removeClass('label-warning');
    $('#google').find('.status').addClass('label-success');
    $('#google').find('.status').html('Connected');
    $('#tout').hide();
    $(div).show();
  }
  
  function which_shown(div1, div2) {
    if ($(div1).is(':visible')) {
      return div1;
    } else if ($(div2).is(':visible')) {
      return div2;
    }
  }
  
  function prep_graphs() {
    $('#chart-heading h2').html('All Trends');
    graph_ready();
    $('#graph').hide();
    $('#graphs').show();
  }
  
  function submit_click() {
    var query = $('#search').val(),
        data  = $('#data').val(),
        time  = $('#time').val();
      
    if (query.length > 0 && data.length > 0 && time.length > 0) {
      graph_loading(which_shown('#graph', '#graphs'));
    
      var params = {
        query : query,
        data  : data,
        date  : time
      };
      
      console.log('Submitting params to server ', params);
      socket.emit('search', params);
    } else {
      alert('Whoops! Looks like you forgot to enter something. Make sure Data Source, Time Scale and Search are all filled out!');
      graph_ready(which_shown('#graph', '#graphs'));
    }
      
  }      
  
  // client-server communication
  socket.on('connect', function(data) {
    socket.emit('join', 'hello from client ');
    console.log('Client connected to server');
    
    $('.status').removeClass('label-danger');
    $('.status').removeClass('label-warning');
    $('.status').addClass('label-success');
    $('.status').html('Connected');
    
    var params_onload = {
          query : 'mind',
          data  : 'Google Trends',
          date  : 'Last Hour'
        };
    socket.emit('search', params_onload);
  });
  
  socket.on('messages', function(data) {
    console.log(data);
  });
  
  socket.on('disconnect', function(data) {
    console.log('Client disconnected from server');
    socket.io.reconnect();
  });
  
  socket.on('results', function(data) {
    $(which_shown('#graph', '#graphs')).hide();
    $('#chart-heading h2').html('Google Trends');
    console.log("google\n",data.data.toString());
    drawChart(data, 'graph', 400, 'Google Trends');
    graph_ready('#graph');
  });
  
  socket.on('twitter:statuses/filter', function(data) {
    console.log(data);
    if(data.text.length > 0) {
      tweets++;
      var user = "<span class=\"label label-pill label-primary\">" + data.user +"</span>";
      var location = "<span class=\"label label-pill label-success\">" + data.location +"</span>";
      $("#twitter-stream ul").prepend("<li class=\"list-group-item\">" + user + " from " + location + "<br>" + data.text + "</li>");
      $("#twitter-stream li").first().effect( "highlight", {color:"#194784"}, 2000 ); 
      var tweets = $('#twitter').find('.info').html();
      $('#twitter').find('.info').html(++tweets);
      secs = 0;
    }
  });
  
  socket.on('twitter:search/tweets', function(data) {
    $('#graphs').hide();
    console.log('twitter:search/tweets\n',data);
    $('#chart-heading h2').html('Twitter Trends');
    drawChart(data, 'graph', 400, 'Twitter');
    graph_ready('#graph');
  });
  
  socket.on('alert', function(data) {
    alert(data);
  });
  
  var all = {};
  
  socket.on('All:Twitter', function(tdata) {
    prep_graphs();
    if (tdata.google) {
      all.google = tdata.google;
    }
    if (tdata.twitter) {
      all.twitter = tdata.twitter;
      drawChart(all.twitter, 'graph2', 200, 'Twitter');
    }
    console.log("All:Twitter",all);
  });
  
  socket.on('All:Google', function(gdata) {
    prep_graphs();
    if (gdata.google) {
      all.google = gdata.google;
      drawChart(all.google, 'graph1', 200, 'Google Trends');
    }
    if (gdata.twitter) {
      all.twitter = gdata.twitter;
    }
    console.log("All:Google",all);
  });
  
  socket.on('stream_keywords', function(data) {
    console.log(data);
    $('#stream').empty();
    for (var keyword in data) {
      $('#stream').append('<option>' + data[keyword].toString() + '</option>');
    }
    $('#stream').selectpicker('refresh');
  });
  
  socket.on('disconnect', function() {
    $('.status').removeClass('label-success');
    $('.status').addClass('label-danger');
    var date = new Date();
     $('#twitter').find('.status').html('Disconnected');
    $('#google').find('.status').html('Disconnected since '+date.getHours()+':'+date.getMinutes());
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
  $('#keyword_submit').click(function() {
    var kw = $('#keyword_add input').val();
    console.log('keyword added: '+kw);
    socket.emit('keyword_add', kw);
    $('#keyword_add').hide();
    $('#keyword_view').show();
  });
  
  // disables time dropdown and selects 'Last week' if 'Twitter' or 'All' are selected in data dropdown
  $('#data').change(function() { 
    var selected = $(this).val();
    switch (selected) {
      case "Twitter":
        console.log("case twitter");
        $('#time').prop("disabled", true);
        $('#time').val("Last Week");
        $('#time').selectpicker('refresh');
        break;
      case "Google Trends":
        $('#time').removeProp("disabled");
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
  
  // export button
  $('#export').change(function() { 
    alert("Sorry, this functionality is not yet available -  we're working on it!");
  });
});