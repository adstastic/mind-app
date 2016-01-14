var secs = 0;

$(document).ready(function () {
  google_loading()
  setInterval(function() {
      $('#twitter').find('.waiting').html('Waiting '+secs+'s');
      secs++;
    }, 1000);
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
    google_loading();
    var query = $('#search').val(),
        data  = $('#data').val(),
        time  = $('#time').val();
    
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
  console.log(data);
  drawVisualization(data);
  google_ready();
})

var tweets = 0;

socket.on('twitter', function(data) {
  console.log(data);
  if(data.text.length > 0) {
    tweets++;
    $("#twitter-stream ul").prepend("<li class=\"list-group-item\">" + data.text+ "</li>");
    $("#twitter-stream li").first().effect( "highlight", {color:"#194784"}, 2000 );
    var tweets = $('#twitter').find('.info').html();
    $('#twitter').find('.info').html(++tweets);
    secs = 0;
  }
});

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