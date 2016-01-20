/* renderer.js */
/* Library of rendering functions used to show views on the page */
/*global google, jsPDF, _*/
google.load("visualization", "1", {packages:["corechart"]});

//conversion from day number to day name
var day_dict = {
    0 : "Sunday",
    1 : "Monday",
    2 : "Tuesday",
    3 : "Wednesday",
    4 : "Thursday",
    5 : "Friday",
    6 : "Saturday"
  };

// array to hold chart URI
var chart_URI = [];

// render library functions
var render = {
    
    // uses google visualisation API to render chart
    // REFERENCE https://developers.google.com/chart/interactive/docs/reference?hl=en
    drawChart: function (res, div, height, source, callback) {
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
          colors = ['#592B92'];
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
          callback(chart.getImageURI());
        });
      chart.draw(view, options);
    },
  
    // returns formatted timestamp
    pretty_timestamp : function(iso_string) {
      var d = new Date(iso_string);
      var formatted_date = {
        second  : ('0' + d.getSeconds()).slice(-2),
        minute  : ('0' + d.getMinutes()).slice(-2),
        hour    : ('0' + d.getHours()).slice(-2),
        day     : d.getDay(),
        date    : ('0' + d.getDate()).slice(-2),
        month   : ('0' + d.getMonth()+1).slice(-2), // js months are indexed from 0
        year    : d.getFullYear()
      }
      return formatted_date;
    },
    
    // swaps graph div with loading div and changes status labels accordingly
    graph_loading : function(div) {
      $('#google').find('.status').removeClass('label-success');
      $('#google').find('.status').addClass('label-warning');
      $('#google').find('.status').html('Loading');
      $(div).hide();
      $('#tout').show();
    },
    
    // swaps loading div with graph div and changes status labels accordingly
    graph_ready : function(div) {
      $('#google').find('.status').removeClass('label-warning');
      $('#google').find('.status').addClass('label-success');
      $('#google').find('.status').html('Connected');
      $('#tout').hide();
      $(div).show();
    },
    
    // returns the name of which of two divs is shown
    which_shown : function(div1, div2) {
      if ($(div1).is(':visible')) {
        return div1;
      } else if ($(div2).is(':visible')) {
        return div2;
      }
    },
    
    // prepares graphs when data source 'All' is selected
    prep_graphs : function() {
      $('#relative-interest').show();
      $('#chart-heading h2').html('All Trends');
      this.graph_ready();
      $('#graph').hide();
      $('#graphs').show();
    },
    
    // changes labels accordingly on socket connection
    on_connect : function() {
      $('.status').removeClass('label-danger');
      $('.status').removeClass('label-warning');
      $('.status').addClass('label-success');
      $('.status').html('Connected');
    },
    
    // adds text to labels on page load
    on_load : function() {
      var ts = this.pretty_timestamp(new Date().toISOString());
      var date_string = day_dict[ts.day] + " " + ts.date + "/" + ts.month + "/" + ts.year + " " + ts.hour + ":" + ts.minute;
      $('#google').find('.login').html('Page Loaded at ' + date_string);
    },
    
    // renders tweet in twitter stream list, increments counter 
    draw_tweet : function(data) {
      var user_label = "<span class=\"label label-pill label-primary\">" + data.user +"</span>",
            location_label = "<span class=\"label label-pill label-success\">" + data.location +"</span>",
            ts = this.pretty_timestamp(data.created_at),
            date_string = day_dict[ts.day] + " " + ts.date + "/" + ts.month + "/" + ts.year + " " + ts.hour + ":" + ts.minute,
            date_label = "<span class=\"label label-pill label-default\">" + date_string +"</span>";
        $("#twitter-stream ul").prepend("<li class=\"list-group-item\">" + user_label + " from " + location_label + "<br>" + data.text + "<br>" + date_label + "</li>");
        $("#twitter-stream li").first().effect( "highlight", {color:"#194784"}, 2000 ); 
        var tweets = $('#twitter').find('.info').html();
        $('#twitter').find('.info').html(++tweets);
    },
    
    // draws twitter chart
    draw_twitter : function(data, callback) {
      $('#relative-interest').hide();
      $('#graphs').hide();
      $('#chart-heading h2').html('Twitter Trends');
      this.drawChart(data, 'graph', 400, 'Twitter', callback);
      this.graph_ready('#graph');
    },
    
    // draws twitter chart
    draw_google : function(data, callback) {
      $('#relative-interest').show();
      $(this.which_shown('#graph', '#graphs')).hide();
      $('#chart-heading h2').html('Google Trends');
       this.drawChart(data, 'graph', 400, 'Google Trends', callback);
      this.graph_ready('#graph');
    },
    
    // refreshes keyword list
    refresh_keywords : function(data) {
      $('#stream').empty();
      for (var keyword in data) {
        $('#stream').append('<option>' + data[keyword].toString() + '</option>');
      }
      $('#stream').selectpicker('refresh');
    },

    // updates status labels on disconnect
    on_disconnect : function() {
      $('.status').removeClass('label-success');
      $('.status').addClass('label-danger');
      var date = new Date();
      $('#twitter').find('.status').html('Disconnected');
      $('#google').find('.status').html('Disconnected since '+date.getHours()+':'+date.getMinutes());
    },
    
    // adds a chart data URI to array
    add_chart_URI : function(URI) {
      chart_URI.push(URI);
      console.log('chartURI ', chart_URI)
    },
    
    // returns chart data URI array
    get_chart_URI : function() {
      return chart_URI;
    },
    
    reset_chart_URI : function() {
      chart_URI = [];
    },
    
    // renders pdf and downloads
    export_pdf : function(chart_URI) {
      console.log('generating pdf for ', chart_URI);
      var doc = new jsPDF();
      doc.setFontSize(40);
      doc.text(35, 25, "Charts");
      doc.setFontSize(20);
      var height = 50; // used as starting y coordinate so each successive image renders below previous one
      _.each(chart_URI, function(URI, i) {
        console.log(URI);
        doc.addImage(URI, 'JPEG', 15, height, 180, 80);
        height += 90;
      });
      doc.save('mind-dashboard-export.pdf');
    },
    
    // opens chart as image in new tab (works on 'All' for multiple charts as well)
    image_window: function(chart_URI) {
      _.each(chart_URI, function(URI) {
        window.open(URI);
      })
  }
};