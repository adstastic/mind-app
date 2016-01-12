$(document).ready(function () {
  $('#graph').hide();
  $('#tout').show();
});

var socket = io.connect();
socket.on('connect', function(data) {
  socket.emit('join', 'hello from client ');
  console.log('Client connected to server');

  
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

socket.on('results', function(data) {
  console.log(data.data);
  drawVisualization(data.data, data.title);
  $('#tout').hide();
  $('#graph').show();
})

var tweets = 0;

socket.on('twitter', function(data) {
  console.log(data);
  if(data.text.length > 0) {
    tweets++;
    $("#twitter-stream ul").prepend("<li class=\"list-group-item\">" + data.text+ "</li>");
    $("#twitter-stream li").first().effect( "highlight", {color:"#194784"}, 3000 );
  }
});

