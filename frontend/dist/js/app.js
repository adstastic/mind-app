var socket = io.connect();
socket.on('connect', function(data) {
  socket.emit('join', 'hello from client ');
  console.log('Client connected to server');
});

socket.on('messages', function(data) {
  console.log(data);
});

socket.on('disconnect', function(data) {
  console.log('Client disconnected from server');
});

$('#submit').click(function() {
    var query = $('#search').val(),
        data  = $('#data').val().toString(),
        time  = $('#time').val().toString();
    
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
})

socket.on('twitter', function(data) {
  console.log(data);
})