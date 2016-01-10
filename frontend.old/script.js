var params = {
    preface : "/www.google.co.uk/trends/fetchComponent?",
    hl      : "en-GB",
    q       : "transgender",
    date    : "now+7-d",
    cmpt    : "q",
    tz      : "Etc/GMT",
    content : '1',
    cid     : "TIMESERIES_GRAPH_0",
    export  : '5',
    w       : ($('body').width()*0.9).toString(),
    h       : ($('body').width()*0.6).toString()
};

var time_syntax = {
    '1y'    : "today+12-m",
    '3m'     : "today+3-m",
    '1m'     : "today+1-m",
    '1w'     : "now+7-d",
    '1d'     : "now+1-d",
    '4h'     : "now+4-H",
    '1h'     : "now+1-H",
    'at'     : ""
};

function reload_chart(params) {
  console.log("Current src: "+$('iframe').attr('src'));
  var src = "//"+params['preface'];
  console.log('generating new src URL...')
  for (var i=1; i<Object.keys(params).length; i++) { 
    key = Object.keys(params)[i];    
    src += key + "=" + params[key] + "&";
  }
  src = src.slice(0, -1);
  $('iframe').attr('src', src);
  $('iframe').attr('width', params['w']+10);
  $('iframe').attr('height', params['h']+10);
  console.log("New src: "+src);
} 

function process_form(id) {
  if (id === 'advanced') {
    var time = $('#timeframe').find("option:selected").val();
    console.log(time);
    time = time_syntax[time];
    
    params['date'] = time;
  } 
  console.log('processing query...')
  var query = $('#search-term').val();
  var q = encodeURIComponent(query.trim());
  console.log(q);
  
  params['q'] = q;
  
  console.log(params);
  reload_chart(params);
  $('#search-term').attr('value', query);
}

$(document).ready(function () {
  $('#chart').width($('body').width()*0.9);
  $('#chart').attr('height', $('body').width()*0.6);
  var src = "//www.google.co.uk/trends/fetchComponent?hl=en-GB&q=mind+charity&tz=Etc/GMT&content=1&cid=TIMESERIES_GRAPH_0&export=5&w="+($('body').width()*0.9).toString()+"&h"+($('body').width()*0.6).toString()+"";
  $('iframe').attr('src', src);
  $('#search-term').attr('value', 'mind charity');
  $('#timeframe').val('at');
});

