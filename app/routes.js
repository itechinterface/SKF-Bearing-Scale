module.exports = function(app,io) {

	var gpio = require('rpi-gpio');
	var exec = require('child_process').exec;
	var fs = require('fs');
	var serialNumber = "";
	var sqlite3 = require('sqlite3').verbose();
	var db;
	var port;
	createDb();

	////////// DATABASE /////////////////////////////////
	function createDb() {
		db = new sqlite3.Database('ws.sqlite3');
		getGeneralSettings();
	}
	////////// DATABASE_END ////////////////////////////
	var result = exec("cat /proc/cpuinfo | grep Serial", function (error, stdout, stderr) {
		if(error){
			console.error('exec error: ${error}');
		}
		else{
			var hwserial = stdout.toString();
			hwserial = hwserial.split(':')[1];
			hwserial = hwserial.replace(' ','');
			hwserial = hwserial.substring(0,16);
			//console.log("=",hwserial,"=");

			if(hwserial.toString() == serialNumber.toString()){
									console.log('Serial match');
							}
							else{
									/*setTimeout(function () {
												var child = exec("sudo shutdown -h now", function (error, stdout, stderr) {
									
												});
									},1000);*/
							}
		}
	});

	///////// GENERAL_SETTINGS //////////////////////////
	/*	
		gpio.destroy();
		gpio.reset();

		gpio.on('export', function(channel) {
					console.log('Channel set: ' + channel);
		});

		var prevValue = false;
		gpio.on('change', function(channel, value) {
			//console.log('Channel ' + channel + ' value is now ' + value);
			if(value == true && prevValue == false){
				io.sockets.emit('forceprint', true);
				console.log("Button Push...");
			}
			prevValue = value;
		});

		gpio.setup(16, gpio.DIR_IN, gpio.EDGE_BOTH);
	
    */    
	
	var SerialPort = require('serialport');
    //const Readline = SerialPort.parsers.Readline;

	function getGeneralSettings() {

		try {
			var stats = fs.lstatSync('/dev/ttyUSB0');
			var result = exec("echo RaspberryPi | sudo -S chmod a+rw /dev/ttyUSB0", function (error, stdout, stderr) {
				port = new SerialPort('/dev/ttyUSB0', {
					baudRate: 9600,
					parser: SerialPort.parsers.readline("\n")
				});
				var str = '';
				port.on('open', function () {
					console.log("Open");
					port.on('data', function (data) {
						var data = data.toString('utf8');
						data = data.replace('.','');
						data = data.replace('.','');
						//console.log(data);
						io.sockets.emit('message', data.toString());
					});
				});
				initPrinter();
                        });
		}
		catch (err) {
			console.log("No Weight Attached");
			initPrinter();
		}
	}

    var printer = undefined;
	function initPrinter() {

		if(printer == undefined)
		{
			try{
				var stats = fs.lstatSync('/dev/usb');
				if (stats.isDirectory()) {


					var result = exec("echo RaspberryPi | sudo -S chmod a+rw /dev/usb/lp0", function (error, stdout, stderr) {
                                                try{
						printer = new SerialPort('/dev/usb/lp0', { baudrate: 9600});
                                                console.log("Open Printer Port");
                                                    }
                                                    catch(e){}
						return printer;
					});

				}
			}
			catch(err){
				console.log("Error on printer"+err);
			}
		}
		else{
			return printer;
		}
	}

	// var SerialPort = require('serialport');
	
	///////// GENERAL_SETTINGS_END //////////////////////////
	
	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		next();
	});

	app.post('/api/getip',function (req,res) {
		res.json(getNetworkIP());
	});

	function getNetworkIP() {
		var os = require('os');
		var ifaces = os.networkInterfaces();
		var addresses = [];

		Object.keys(ifaces).forEach(function (ifname) {
			var alias = 0;

			ifaces[ifname].forEach(function (iface) {
				if ('IPv4' !== iface.family || iface.internal !== false) {
					return;
				}

				if (alias >= 1) {
					addresses.push(iface.address);
				} else {
					addresses.push(iface.address);
				}
				++alias;
			});
		});

		if(!addresses.length>0)addresses.push('0.0.0.0');
		return addresses;
	}

	app.post('/api/getBatchRecords',function (req,res) {
		db.all("SELECT * FROM BatchData order by EX3 desc limit 50", function(err, rows) {
			res.json({'error':false,'data':rows});
		});
    });

	function getDT(date) {
            var dd = date.getDate();
            dd =  parseInt(dd)<10 ? '0'+dd : dd;
            var MM = date.getMonth()+1;
            MM =  parseInt(MM)<10 ? '0'+MM : MM;
            var yy = date.getFullYear();
            
            //var sDate = yy+'-'+MM+'-'+dd;
            var sDate = dd+'-'+MM+'-'+yy;
            return sDate;
        }
	
	app.post('/api/getBatchSearchRecords',function (req,res) {
		var from = getDT(new Date(req.body.from));
		from = from+" "+"00:01";
		var to = getDT(new Date(req.body.to));
		to = to+" "+"23:59";
		var query = "select *  from BatchData where EX2  BETWEEN '"+from+"' and '"+to+"'";
		console.log(query);
		db.all(query, function(err, rows) {
			res.json({'error':false,'data':rows});	
		});
	});

	app.post('/api/searchbearing',function (req,res) {
		db.all("SELECT * FROM BatchData where BEARING_TYPE = '"+req.body.BearingNo+"' and BEARING_NO = '"+req.body.SrNo+"' order by ID desc LIMIT 1", function(err, rows) {
			res.json({'error':false,'data':rows});
		});
    });
	
	app.post('/api/addbatchdata',function (req,res) {
		
		//console.log(req.body);
		var BearingNo = req.body.BearingNo;
		var SrNo = req.body.SrNo;
        var Username = req.body.Username;
		var UserCode = req.body.UserCode;
		var Extra1 = req.body.Extra1;
		var Extra2 = req.body.Extra2;
		var Status = req.body.Status;
		var BeforeWt = req.body.BeforeWt;
		var AfterWt = req.body.AfterWt;
		
		db.all("SELECT * FROM BatchData where BEARING_TYPE = '"+BearingNo+"' and BEARING_NO = '"+SrNo+"'", function(err, rows) {
			console.log(rows);

			if(rows && rows.length > 0)
			{
				if(Status == 1)
				{
					var ResultWt = (parseFloat(BeforeWt) - parseFloat(rows[0].AFTER_WEIGHT)).toFixed(3);
					var DT = getDateTime();
					var query = "Update BatchData set BEFORE_WEIGHT = "+BeforeWt+",BEFORE_DATETIME = '"+DT+"',RESULT_WEIGHT = "+ResultWt+",RESULT_DATETIME = '"+DT+"',EMPNAME = '"+Username+"',EMPCODE = '"+UserCode+"',EX1 = '',EX2 = '"+DT+"',EX3 = '"+Date.now()+"' where BEARING_TYPE = '"+rows[0].BEARING_TYPE+"' and BEARING_NO = '"+rows[0].BEARING_NO+"'";
					var stmt = db.prepare(query);
					console.log(query);
					stmt.run();
					stmt.finalize();
					var label = "^XA^PW400^LL400^LS0"+
					"^FT20,50^A0N,22,22^FH\^CI28^FDBearing No. : "+BearingNo+"^FS^CI27"+
					"^FT20,100^A0N,22,22^FH\^CI28^FDSr.No. :  "+SrNo+"^FS^CI27"+
					"^FT20,150^A0N,22,22^FH\^CI28^FDBefore Weight :  "+parseFloat(BeforeWt).toFixed(3)+" kg.^FS^CI27"+
					"^FT20,200^A0N,22,22^FH\^CI28^FDAfter Weight :  "+parseFloat(rows[0].AFTER_WEIGHT).toFixed(3)+" kg.^FS^CI27"+
					"^FT20,250^A0N,22,22^FH\^CI28^FDResult  Difference :  "+parseFloat(ResultWt).toFixed(3)+" kg.^FS^CI27"+
					"^FT20,300^A0N,22,22^FH\^CI28^FDMeasured  By : "+Username+", "+UserCode+"^FS^CI27"+
					"^FT20,350^A0N,22,22^FH\^CI28^FDDate & Time : "+DT+"^FS^CI27"+
					"^PQ1,0,1,Y"+
					"^XZ";
					var printer_ = initPrinter();
					if(printer_ != undefined)
					{
						printer_.write(label, function (err) {
						});
					}
					res.json({'error':false});
				}
				else{

					var ResultWt = (parseFloat(rows[0].BEFORE_WEIGHT) - parseFloat(AfterWt)).toFixed(3);
					var DT = getDateTime();
					var query = "Update BatchData set AFTER_WEIGHT = "+AfterWt+",AFTER_DATETIME = '"+DT+"',RESULT_WEIGHT = "+ResultWt+",RESULT_DATETIME = '"+DT+"',EMPNAME = '"+Username+"',EMPCODE = '"+UserCode+"',EX1 = '',EX2 = '"+DT+"',EX3 = '"+Date.now()+"' where BEARING_TYPE = '"+rows[0].BEARING_TYPE+"' and BEARING_NO = '"+rows[0].BEARING_NO+"'";
					console.log(query);
					var stmt = db.prepare(query);
					stmt.run();
					stmt.finalize();

					var label = "^XA^PW400^LL400^LS0"+
					"^FT20,50^A0N,22,22^FH\^CI28^FDBearing No. : "+BearingNo+"^FS^CI27"+
					"^FT20,100^A0N,22,22^FH\^CI28^FDSr.No. :  "+SrNo+"^FS^CI27"+
					"^FT20,150^A0N,22,22^FH\^CI28^FDBefore Weight :  "+parseFloat(rows[0].BEFORE_WEIGHT).toFixed(3)+" kg.^FS^CI27"+
					"^FT20,200^A0N,22,22^FH\^CI28^FDAfter Weight :  "+parseFloat(AfterWt).toFixed(3)+" kg.^FS^CI27"+
					"^FT20,250^A0N,22,22^FH\^CI28^FDResult  Difference :  "+parseFloat(ResultWt).toFixed(3)+" kg.^FS^CI27"+
					"^FT20,300^A0N,22,22^FH\^CI28^FDMeasured  By : "+Username+", "+UserCode+"^FS^CI27"+
					"^FT20,350^A0N,22,22^FH\^CI28^FDDate & Time : "+DT+"^FS^CI27"+
					"^PQ1,0,1,Y"+
					"^XZ";
					var printer_ = initPrinter();
					if(printer_ != undefined)
					{
						printer_.write(label, function (err) {
						});
					}
					res.json({'error':false});
				}
			}
			else{
				if(Status == 1)
				{
					var DT = getDateTime();
					var stmt = db.prepare("INSERT INTO BatchData('BEARING_TYPE','BEARING_NO','BEFORE_WEIGHT','BEFORE_DATETIME','EMPNAME','EMPCODE','EX1','EX2','EX3') VALUES (?,?,?,?,?,?,?,?,?)");
					stmt.run(BearingNo,SrNo,BeforeWt,DT,Username,UserCode,'',DT,Date.now());
					stmt.finalize();
					var label = "^XA^PW400^LL400^LS0"+
					"^FT20,50^A0N,22,22^FH\^CI28^FDBearing No. : "+BearingNo+"^FS^CI27"+
					"^FT20,100^A0N,22,22^FH\^CI28^FDSr.No. :  "+SrNo+"^FS^CI27"+
					"^FT20,150^A0N,22,22^FH\^CI28^FDBefore Weight :  "+parseFloat(BeforeWt).toFixed(3)+" kg.^FS^CI27"+
					"^FT20,200^A0N,22,22^FH\^CI28^FDAfter Weight :  ^FS^CI27"+
					"^FT20,250^A0N,22,22^FH\^CI28^FDResult  Difference :   ^FS^CI27"+
					"^FT20,300^A0N,22,22^FH\^CI28^FDMeasured  By : "+Username+", "+UserCode+"^FS^CI27"+
					"^FT20,350^A0N,22,22^FH\^CI28^FDDate & Time : "+DT+"^FS^CI27"+
					"^PQ1,0,1,Y"+
					"^XZ";
					var printer_ = initPrinter();
					if(printer_ != undefined)
					{
						printer_.write(label, function (err) {
						});
					}
					res.json({'error':false});
				}
				else{

					var ResultWt = (parseFloat(BeforeWt) - parseFloat(AfterWt)).toFixed(3);
					var DT = getDateTime();
					var stmt = db.prepare("INSERT INTO BatchData('BEARING_TYPE','BEARING_NO','AFTER_WEIGHT','AFTER_DATETIME','RESULT_WEIGHT','RESULT_DATETIME','EMPNAME','EMPCODE','EX1','EX2','EX3') VALUES (?,?,?,?,?,?,?,?,?,?,?)");
					stmt.run(BearingNo,SrNo,AfterWt,DT,ResultWt,DT,Username,UserCode,'',DT,Date.now());
					stmt.finalize();
					var label = "^XA^PW400^LL400^LS0"+
					"^FT20,50^A0N,22,22^FH\^CI28^FDBearing No. : "+BearingNo+"^FS^CI27"+
					"^FT20,100^A0N,22,22^FH\^CI28^FDSr.No. :  "+SrNo+"^FS^CI27"+
					"^FT20,150^A0N,22,22^FH\^CI28^FDBefore Weight :   ^FS^CI27"+
					"^FT20,200^A0N,22,22^FH\^CI28^FDAfter Weight : "+parseFloat(BeforeWt).toFixed(3)+"^FS^CI27"+
					"^FT20,250^A0N,22,22^FH\^CI28^FDResult  Difference : ^FS^CI27"+
					"^FT20,300^A0N,22,22^FH\^CI28^FDMeasured  By : "+Username+", "+UserCode+"^FS^CI27"+
					"^FT20,350^A0N,22,22^FH\^CI28^FDDate & Time : "+DT+"^FS^CI27"+
					"^PQ1,0,1,Y"+
					"^XZ";
					var printer_ = initPrinter();
					if(printer_ != undefined)
					{
						printer_.write(label, function (err) {
						});
					}
					res.json({'error':false});
				}
			}
		});
	});

	app.post('/api/duplicateprint',function (req,res) {
		var item = JSON.parse(req.body.item);
		console.log(item);

		var label = "^XA^PW400^LL400^LS0"+
		"^FT20,50^A0N,22,22^FH\^CI28^FDBearing No. : "+item.BEARING_TYPE+"^FS^CI27"+
		"^FT20,100^A0N,22,22^FH\^CI28^FDSr.No. :  "+item.BEARING_NO+"^FS^CI27"+
		"^FT20,150^A0N,22,22^FH\^CI28^FDBefore Weight :  "+parseFloat(item.BEFORE_WEIGHT).toFixed(3)+"^FS^CI27"+
		"^FT20,200^A0N,22,22^FH\^CI28^FDAfter Weight : "+parseFloat(item.AFTER_WEIGHT).toFixed(3)+"^FS^CI27"+
		"^FT20,250^A0N,22,22^FH\^CI28^FDResult  Difference : "+parseFloat(item.RESULT_WEIGHT)+"^FS^CI27"+
		"^FT20,300^A0N,22,22^FH\^CI28^FDMeasured  By : "+item.EMPNAME+", "+item.EMPCODE+"^FS^CI27"+
		"^FT20,350^A0N,22,22^FH\^CI28^FDDate & Time : "+item.EX2+"^FS^CI27"+
		"^PQ1,0,1,Y"+
		"^XZ";
		var printer_ = initPrinter();
		if(printer_ != undefined)
		{
			printer_.write(label, function (err) {
			});
		}
		// var lblBALE = "^FO"+template.BALE.split(',')[0]+","+template.BALE.split(',')[1]+"^FWR^FD"+item.SrNo+"^FS^";
		// var lblSize = "^FO"+template.SIZE.split(',')[0]+","+template.SIZE.split(',')[1]+"^FWR^FD"+item.Size+"^FS^";
		// var lblPCS = "^FO"+template.PCS.split(',')[0]+","+template.PCS.split(',')[1]+"^FWR^FD"+item.PCS+"^FS^";
		// var lblGSM = "^FO"+template.GSM.split(',')[0]+","+template.GSM.split(',')[1]+"^FWR^FD"+item.GSM+"^FS^";
		// var lblWEIGHT = "^FO"+template.WT.split(',')[0]+","+template.WT.split(',')[1]+"^FWR^FD"+item.Weight+"^FS^";
		// var label = "^XA^CF0,60"+lblBALE+""+lblSize+""+lblPCS+""+lblGSM+""+lblWEIGHT+"^XZ";
		//console.log(label);
		//PrintData(label);
		res.json({'error':false,'data':[]});
	});

	io.sockets.on('connection', function (socket) {

	});

	io.sockets.on('disconnect', function (socket) {
		//console.log("Client disconnected...");
	});

	function getDate() {
		var date = new Date();
		var dd = date.getDate();
		dd =  parseInt(dd)<10 ? '0'+dd : dd;
		var MM = date.getMonth()+1;
		MM =  parseInt(MM)<10 ? '0'+MM : MM;
		var yy = date.getFullYear();
		var hh = date.getHours();
		hh =  parseInt(hh)<10 ? '0'+hh : hh;
		var mm = date.getMinutes();
		mm =  parseInt(mm)<10 ? '0'+mm : mm;
		var ss = date.getSeconds();
		ss =  parseInt(ss)<10 ? '0'+ss : ss;
		return dd+'-'+MM+'-'+yy;
	}

	function getDateTime() {
		var date = new Date();
		var dd = date.getDate();
		dd =  parseInt(dd)<10 ? '0'+dd : dd;
		var MM = date.getMonth()+1;
		MM =  parseInt(MM)<10 ? '0'+MM : MM;
		var yy = date.getFullYear();
		var hh = date.getHours();
		hh =  parseInt(hh)<10 ? '0'+hh : hh;
		var mm = date.getMinutes();
		mm =  parseInt(mm)<10 ? '0'+mm : mm;
		var ss = date.getSeconds();
		ss =  parseInt(ss)<10 ? '0'+ss : ss;
		return dd+'-'+MM+'-'+yy+' '+hh+':'+mm;
	}

	app.post('/api/removeitem',function (req,res) {
		
		var id = req.body.id;
		var query = "DELETE from BatchData where ID = "+id;
		var stmt = db.prepare(query);
		stmt.run();
		stmt.finalize();
		res.json({'error':false,'data':[]});

    });

	app.post('/api/resetall',function (req,res) {
	    var query = "DELETE from BatchData";
		var stmt = db.prepare(query);
		stmt.run();
		stmt.finalize();
		res.json({'error':false,'data':[]});
   	 });

	app.post('/api/updatedate',function (req,res) {

		var date_time = req.body.date_time
                console.log(date_time);
		setTimeout(function () {
			var child = exec("echo RaspberryPi | sudo -S date -s '"+date_time+"'", function (error, stdout, stderr) {
			});
		},1000);
		res.json('1');
	});

	app.get('*', function(req, res) {
		res.sendfile('./public/index.html');
	});
};
