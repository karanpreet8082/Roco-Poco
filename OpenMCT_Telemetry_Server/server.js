// main file of the telemtry server, comment/uncomment what is needed

//import the objects

// var Spacecraft = require('./spacecraft');
var TFlex = require('./tflex');
var Flutterometer = require('./flutterometer');
var Dg800 = require('./DG800');
// var Horyzn = require('./horyzn');
var RealtimeServer = require('./realtime-server');
var HistoryServer = require('./history-server');
//var StaticServer = require('./static-server');
var HistoryReader = require('./history_reader');
var aircraft_42 = require('./aircraft_42');

var expressWs = require('express-ws');
var app = require('express')();
expressWs(app);


// initialize the objects

// var spacecraft = new Spacecraft();
var tflex = new TFlex();
// var flutterometer = new Flutterometer();
var dg800 = new Dg800();
//var horyzn = new Horyzn();
// var realtimeServer = new RealtimeServer(spacecraft,8082);
// var historyServer = new HistoryServer(spacecraft, 8081);
//var staticServer = new StaticServer(8080);
//var realtimeServer = new RealtimeServer(tflex,8092);
//var historyServer = new HistoryServer(tflex, 8091);
//var realtimeServer = new RealtimeServer(flutterometer,8102);
//var historyServer = new HistoryServer(flutterometer, 8101);


var aircraft_4242 = new aircraft_42;


var historyReader = new HistoryReader;

var realtimeServerFLEXOP = new RealtimeServer(tflex);
var historyServerFLEXOP = new HistoryServer(tflex);

// var realtimeServerFLIPASED = new RealtimeServer(flutterometer);
// var historyServerFLIPASED = new HistoryServer(flutterometer);

var realtimeServerDG800 = new RealtimeServer(dg800);
var historyServerDG800 = new HistoryServer(dg800);



var realtimeServeraircraft_4242 = new RealtimeServer(aircraft_4242);
var historyServeraircraft_4242 = new HistoryServer(aircraft_4242);




// use the objects

// app.use('/FLEXOPRealtime', realtimeServerFLEXOP);
// app.use('/FLEXOPHistory', historyServerFLEXOP);

var historyServerReader = new HistoryServer(historyReader);

// app.use('/FLUTTERRealtime', realtimeServerFLIPASED);
// app.use('/FLUTTERHistory', historyServerFLIPASED);

// app.use('/DG800Realtime', realtimeServerDG800);
// app.use('/DG800History', historyServerDG800);



app.use('/aircraft_4242Realtime', realtimeServeraircraft_4242);
app.use('/aircraft_4242History', historyServeraircraft_4242);




app.use('/HistoryReader', historyServerReader);


// start the server

var port = process.env.PORT || 16969
app.listen(port)
