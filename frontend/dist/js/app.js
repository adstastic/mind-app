var secs = 0;

$(document).ready(function () {
  var date = new Date();
  var date_string = date.getDate() + "/" + date.getMonth()+1 + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
  $('#google').find('.login').html('Page Loaded at ' + date_string);
  google_loading()
  setInterval(function() {
      $('#twitter').find('.waiting').html('Waiting '+secs+'s');
      secs++;
    }, 1000);
  $('.selectpicker').selectpicker({
    style: 'btn-default'
  });
});


/*global io*/
var socket = io.connect();
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
      }
  socket.emit('search', params_onload);
});

socket.on('messages', function(data) {
  console.log(data);
});

socket.on('disconnect', function(data) {
  console.log('Client disconnected from server');
  socket.io.reconnect();
});

$('#submit').click(function() {
    var query = $('#search').val(),
        data  = $('#data').val(),
        time  = $('#time').val();
    
    if (data == "Google Trends") google_loading();
    if (query && data && time) {
      var params = {
        query : query,
        data  : data,
        date  : time
      }
      
      console.log('Submitting params to server ', params);
      socket.emit('search', params);
    } else {
      alert('Whoops! Looks like you forgot to enter something. Make sure Data Source, Time Scale and Search are all filled out!');
    }
    
});

/*global drawVisualization*/
socket.on('results', function(data) {
  console.log(data.data.toString());
  drawVisualization(data);
  google_ready();
})

var tweets = 0;

socket.on('twitter:statuses/filter', function(data) {
  console.log(data);
  if(data.text.length > 0) {
    tweets++;
    var user = "<span class=\"label label-pill label-primary\">" + data.user +"</span>";
    var location = "<span class=\"label label-pill label-success\">" + data.location +"</span>";
    var tweet_label = "<span class=\"label label-pill label-info\">Tweet</span>";
    $("#twitter-stream ul").prepend("<li class=\"list-group-item\">" + user + " from " + location + "<br>" + data.text + "</li>");
    $("#twitter-stream li").first().effect( "highlight", {color:"#194784"}, 2000 ); 
    var tweets = $('#twitter').find('.info').html();
    $('#twitter').find('.info').html(++tweets);
    secs = 0;
  }
});

socket.on('twitter:search/tweets', function(data) {
  console.log('twitter:search/tweets\n',data);
});

socket.on('alert', function(data) {
  alert(data);
})

socket.on('disconnect', function() {
  $('.status').removeClass('label-success');
  $('.status').addClass('label-danger');
  var date = new Date();
   $('#twitter').find('.status').html('Disconnected');
  $('#google').find('.status').html('Disconnected since '+date.getHours()+':'+date.getMinutes());
});

function google_loading() {
  $('#google').find('.status').removeClass('label-success')
  $('#google').find('.status').addClass('label-warning')
  $('#google').find('.status').html('Loading')
  $('#graph').hide();
  $('#tout').show();
}

function google_ready() {
  $('#google').find('.status').removeClass('label-warning')
  $('#google').find('.status').addClass('label-success')
  $('#google').find('.status').html('Connected')
  $('#tout').hide();
  $('#graph').show();
}

$('#data').change(function() { 
  var selected = $(this).val();
  switch (selected) {
    case "Twitter":
      console.log("case twitter")
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

$('#export').change(function() { 
  alert("Sorry, this functionality is not yet available -  we're working on it!");
});

