// telemetry source object for the DG800

const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const fs = require('fs');


function Dg800() {

	let rawDict = fs.readFileSync('../openmct/example/DG800/DG800dictionary.json')
	let dict = JSON.parse(rawDict)
	//console.log(dict.measurements.map(obj => obj.key))

	this.state={};
	(dict.measurements.map(obj => obj.key)).forEach(function (k) {
		this.state[k] = 0;
	}, this);

    this.history = {};
    this.listeners = [];
	this.data = [];
	this.continousLogging = false;
	this.FileTimestamp = '';

	Object.keys(this.state).forEach(function (k) {
        this.history[k] = [];
	}, this);

    setInterval(function () {
        this.generateIntervalTelemetry();
    }.bind(this), 100); //z.B. 100ms according to SFTE

    var count = 0 //for calculations
	var initGPSheight = 0; //for calculations

	//what to do, when a message from the UDP Port arrives
    server.on('message', (msg, rinfo) => {
		this.data = `${msg}`.split(',');
		
		this.state[this.data[0]] = this.data[1];
		this.state['Time.stamp'] = Math.round(this.data[2]*1000); //convert python timestamp[s] to JS timestamp [ms]
		
		
		//CALCULATIONS

			// change gps from mm to m
			if (this.data[0] === 'data.gps.heightMS' || this.data[0] === 'data.gps.gSpeed'){
			this.state[this.data[0]] = Math.round((this.data[1]/1000 - this.initGPSheight) *100)/100;
			}
			if (this.data[0] === 'data.gps.gSpeed'){
			this.state[this.data[0]] = this.data[1]/1000;
			}

			// rescale thrust ppm for display
			if (this.data[0] === 'data.nano.ch1'){
			this.state[this.data[0]] = this.data[1]/40;
			}


			// initial ground height
			if (this.data[0] === 'data.gps.heightMS' && this.state['data.gps.fixType'] === '3' && count < 100){
			initGPSheight = this.data[1]/1000;
			count = count + 1;
			}

/*			// fuel consumption in percent
			if (this.data[0] === 'data.nano.v'){
			this.state['data.nano.v'] = this.data[1]/7.5
			console.log(this.state[this.data[0]])
			}
*/
			// calculation airspeed
			if (this.data[0] === 'data.adp.pdyn'){
			this.state['data.adp.AirSpeed'] = Math.round((Math.sqrt((2*Math.abs(this.state['data.adp.pdyn']))/(this.state['data.adp.pstat']/(287*(parseFloat(this.state['data.thr.temp1'])+273.15)))))*100)/100;
			//console.log(this.state['data.adp.AirSpeed']);
			}

			// round Fuel Mass Flow
			if (this.data[0] === 'data.nano.v'){
			this.state['data.nano.v'] = Math.round(this.data[1]/7.5*100)/100;
			//console.log(this.state['data.adp.AirSpeed']);
			}

		//console.log(this.state);
		

		//// to notify telemetry server every time new data arrives in uncomment here and comment the interval based approach
		//this.generateRealtimeTelemetry();


		//// Save History on every message, for highest possible resolution
		// Real Timestamp
		var timestamp = this.state['Time.stamp'];
		// Artificial timestamp (if no timestamp is sent)
		//var timestamp= Date.now();

		// built message
		var message = { timestamp: timestamp, value: this.state[this.data[0]], id: this.data[0]};
			try{ // store in history
				this.history[this.data[0]].push(message);
				//console.log(this.history[this.data[0]])
				
				// if continous logging is activated, append message to log file
				if(this.continousLogging){					
		
					//Using Promises for less interrupting the main loop
					this.asyncStringyify(message).then(function(write) {//write is the value of the resolved promise in asyncStringify
						fs.appendFile(__dirname + '/saved_logs/DG800_'+this.FileTimestamp+'_rawMessage.json', write, (err) => {
							if (err) {
								console.log(err);
							} 
						}) 
					}.bind(this));

				}	
				} catch (e) {
					console.log(e)
				}

	});
	
	server.on('error', (err) => {
		console.log(`DG800 UDP server error:\n${err.stack}`);
		try{
			console.log('Try to reconnect...')
			server.bind(50012);
		} catch(e) {
			console.log('Reconnect Failed...')
			console.log(e)
			server.close()
		}
		
	});

	// port specified in the associated python script
	server.bind(50012);

    console.log("DG800 initialized!");
};


// to update every time new data comes in
Dg800.prototype.generateRealtimeTelemetry = function () {

	// Real Timestamp
	var timestamp = this.state['Time.stamp'];
	// Artificial timestamp
	//var timestamp= Date.now();

	// built message
	var message = { timestamp: timestamp, value: this.state[this.data[0]], id: this.data[0]};
	// notify realtimeserver
	this.notify(message);
	//console.log(message);

}


// to update interval based (STFE)
Dg800.prototype.generateIntervalTelemetry = function () {

    Object.keys(this.state).forEach(function (id) {

        // Real Timestamp
		var timestamp = this.state['Time.stamp'];
		// Artificial timestamp
        //var timestamp= Date.now();

		// built message
		var message = { timestamp: timestamp, value: this.state[id], id: id};
		// notify realtimeserver
        this.notify(message);
		
	}, this);
	//console.log(state);
};


// notifiy function, called in generate Telemetry, notifies listeners
Dg800.prototype.notify = function (point) {
    this.listeners.forEach(function (l) {
        l(point);
    });
};


// manages listeners for realtime telemetry
Dg800.prototype.listen = function (listener) {
    this.listeners.push(listener);
    return function () {
        this.listeners = this.listeners.filter(function (l) {
            return l !== listener;
        });
    }.bind(this);
};

// Creating a File Timestamp 
Dg800.prototype.SetFileTimestamp = function () {

	//zero needed for right time and date format when copy-pasting in OpenMCT
	addZero = function(dateNumber) {
		if (dateNumber.toString().length == 1){
			dateNumber = '0'+dateNumber.toString()
		}
		return dateNumber
	}
	//Generate timestamp for the File
	var date = new Date();
	var year = date.getFullYear();
	var month = addZero(date.getMonth() + 1);      // "+ 1" because the 1st month is 0
	var day = addZero(date.getDate());
	var hour = addZero(date.getHours());
	var minutes = addZero(date.getMinutes());
	var seconds = addZero(date.getSeconds());
	this.FileTimestamp = year+ '-'+ month+ '-'+ day+ ' '+ hour+ '-'+ minutes+ '-'+ seconds;

};

//asynchronous Strigify an object/a variable to JSON format
Dg800.prototype.asyncStringyify = function (obj) {
	return new Promise((resolve, reject) => {
	  resolve(JSON.stringify(obj));
	});
  }



// what to do on incoming command
Dg800.prototype.command = function (command) {

	// Logs the history variable (this.history) once
	if(command === ':saveHistory'){
		
		
		this.SetFileTimestamp()

		//Using Promises for not interrupting the main loop
		function asyncSaveHistory(str) {
			return new Promise((resolve, reject) => {
			  resolve(JSON.stringify(str));
			});
		  }

		this.asyncStringyify(this.history).then(function(write) {//write is the value of the resolved promise in asyncStringify
			fs.writeFile(__dirname + '/saved_logs/DG800_'+this.FileTimestamp+'_History.json', write, (err) => {
				if (err) {
					console.log(err);
				} else {
				console.log('History Saved!')
				}
			}) 
		}.bind(this));
	
	};


	// Logs the history variable (this.history) every 10s
	// because of the structure of this.history, with the current logic the file has to be rewritten on every save
	// due to this, a lot of performance is needed, especially on long recordings >20min with a lot of data (40 telemetry points @10Hz)
	// not recommended, instead save the history at the end of the test with the "saveHistory" command on log only messages continously, so secure the data

	// if(command === ':startcontinousHistoryLog'){
		
	// 	this.SetFileTimestamp()

	// 	Using Promises for not interrupting the main loop
	// 	function asyncLogging(src) {
	// 		return new Promise((resolve, reject) => {
				
	// 		  resolve(JSON.stringify(src));
	// 		});
	// 	  }
		
	
	// 	save log in specified interval
	// 	logging = setInterval(function () {
	// 		asyncLogging(this.history).then(function(write) {//write is the value of the resolved promise in asyncStringify
	// 			fs.writeFile(__dirname + '/saved_logs/DG800_'+this.FileTimestam+'.json', write, (err) => {
	// 				if (err) {
	// 					throw err;
	// 				}
	// 				console.log(this.history);
	// 				console.log('Logging!')
	// 			}) 
	// 		}.bind(this));
	// 	}.bind(this), 10000); 
	
			
	// };


	// if(command === ':endContinousHistoryLog'){
	// 	clearInterval(logging);
	// 	console.log('Logging stopped!')	
	// };


	// for continous logging use this method, saved file can not be used in OpenMCT as is, but all data is stored more efficiently 
	if(command === ':startLog'){

		this.SetFileTimestamp()

		this.continousLogging = true;
		console.log('Logging started!')	
	};

	if(command === ':endLog'){
		this.continousLogging = false;
		console.log('Logging stopped!')	
	};


	// Example implementation of sending a command
	if(command === ':exampleCommandtoPlane'){
		// sending to the udp port 60012 on the address 'loacalhost'
		server.send(command,60012, 'localhost')
		console.log('Command Sent via UDP Port!')	
	};

	
};


module.exports = function () {
    return new Dg800()
};
