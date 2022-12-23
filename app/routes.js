module.exports = function(app,io) {

	var exec = require('child_process').exec;
	var fs = require('fs');
	var serialNumber = "";
	var sqlite3 = require('sqlite3').verbose();
	var db;
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

	function getGeneralSettings() {
		//return;
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

	function PrintData(printData) {
		var printer_ = initPrinter();
			if(printer_ == undefined)
				return;
		printer_.write(printData, function(err) {
		});
	}

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

	// var SerialPort = require('serialport');
	
	///////// GENERAL_SETTINGS_END //////////////////////////
	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		next();
	});

	app.post('/api/getPrintTemplates',function (req,res) {
		db.all("SELECT * FROM PrintTemplate", function(err, rows) {
			res.json({'error':false,'data':rows});
		});
    });

	app.post('/api/updatePrintTemplate',function (req,res) {
		var template = JSON.parse(req.body.template);
		console.log(template);
		var query = "Update PrintTemplate set Name = '"+template.Name+"',BALE = '"+template.BALE+"',SIZE = '"+template.SIZE+"',PCS = '"+template.PCS+"',GSM = '"+template.GSM+"',WT = '"+template.WT+"',EX1 = '"+template.EX1+"',EX2 = '"+template.EX2+"',EX3 = '"+template.EX3+"',EX4 = '"+template.EX4+"',EX5 = '"+template.EX5+"',EX6 = '"+template.EX6+"' where ID = "+template.ID;
		var stmt = db.prepare(query);
		stmt.run();
		stmt.finalize();
		res.json({'error':false,'data':[]});
	});

	app.post('/api/addbatch',function (req,res) {
		var srno = req.body.srno;
		var name = req.body.name;
        var stmt = db.prepare("INSERT INTO BatchRecord('SRNO','Name','Date') VALUES (?,?,?)");
		stmt.run(srno,name,getDate());
		stmt.finalize();
		res.json({'error':false,'data':[]});
	});

	app.post('/api/getBatchRecords',function (req,res) {
		db.all("SELECT * FROM BatchData order by EX3 desc limit 50", function(err, rows) {
			res.json({'error':false,'data':rows});
		});
    });

	app.post('/api/getBatchData',function (req,res) {
		db.all("SELECT * FROM BatchData where BatchID = "+req.body.batchid+" order by ID desc", function(err, rows) {
			res.json({'error':false,'data':rows});
		});
    });

	app.post('/api/searchbearing',function (req,res) {
		db.all("SELECT * FROM BatchData where BEARING_TYPE = '"+req.body.BearingNo+"' and BEARING_NO = '"+req.body.SrNo+"' order by ID desc LIMIT 1", function(err, rows) {
			res.json({'error':false,'data':rows});
		});
    });
	

	app.post('/api/addbatchdata',function (req,res) {
		
		console.log(req.body);

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
					var query = "Update BatchData set BEFORE_WEIGHT = "+BeforeWt+",BEFORE_DATETIME = '"+DT+"',RESULT_WEIGHT = "+ResultWt+",RESULT_DATETIME = '"+DT+"',EMPNAME = '"+Username+"',EMPCODE = '"+UserCode+"',EX1 = '"+Extra1+"',EX2 = '"+Extra2+"',EX3 = '"+Date.now()+"' where BEARING_TYPE = '"+rows[0].BEARING_TYPE+"' and BEARING_NO = '"+rows[0].BEARING_NO+"'";
					var stmt = db.prepare(query);
					console.log(query);
					stmt.run();
					stmt.finalize();
					res.json({'error':false});
				}
				else{

					var ResultWt = (parseFloat(rows[0].BEFORE_WEIGHT) - parseFloat(AfterWt)).toFixed(3);
					var DT = getDateTime();
					var query = "Update BatchData set AFTER_WEIGHT = "+AfterWt+",AFTER_DATETIME = '"+DT+"',RESULT_WEIGHT = "+ResultWt+",RESULT_DATETIME = '"+DT+"',EMPNAME = '"+Username+"',EMPCODE = '"+UserCode+"',EX1 = '"+Extra1+"',EX2 = '"+Extra2+"',EX3 = '"+Date.now()+"' where BEARING_TYPE = '"+rows[0].BEARING_TYPE+"' and BEARING_NO = '"+rows[0].BEARING_NO+"'";
					console.log(query);
					var stmt = db.prepare(query);
					stmt.run();
					stmt.finalize();
					res.json({'error':false});
				}
			}
			else{
				if(Status == 1)
				{
					var DT = getDateTime();
					var stmt = db.prepare("INSERT INTO BatchData('BEARING_TYPE','BEARING_NO','BEFORE_WEIGHT','BEFORE_DATETIME','EMPNAME','EMPCODE','EX1','EX2','EX3') VALUES (?,?,?,?,?,?,?,?,?)");
					stmt.run(BearingNo,SrNo,BeforeWt,DT,Username,UserCode,Extra1,Extra2,Date.now());
					stmt.finalize();
					res.json({'error':false});
				}
				else{

					var ResultWt = (parseFloat(BeforeWt) - parseFloat(AfterWt)).toFixed(3);
					var DT = getDateTime();
					var stmt = db.prepare("INSERT INTO BatchData('BEARING_TYPE','BEARING_NO','AFTER_WEIGHT','AFTER_DATETIME','RESULT_WEIGHT','RESULT_DATETIME','EMPNAME','EMPCODE','EX1','EX2','EX3') VALUES (?,?,?,?,?,?,?,?,?,?,?)");
					stmt.run(BearingNo,SrNo,AfterWt,DT,ResultWt,DT,Username,UserCode,Extra1,Extra2,Date.now());
					stmt.finalize();
					res.json({'error':false});
				}
			}
		});
	});

	app.post('/api/duplicateprint',function (req,res) {
		
		var template = JSON.parse(req.body.template);
		template = JSON.parse(template);
		var item = JSON.parse(req.body.item);
		console.log(item);
		console.log(template);
		
		var lblBALE = "^FO"+template.BALE.split(',')[0]+","+template.BALE.split(',')[1]+"^FWR^FD"+item.SrNo+"^FS^";
		var lblSize = "^FO"+template.SIZE.split(',')[0]+","+template.SIZE.split(',')[1]+"^FWR^FD"+item.Size+"^FS^";
		var lblPCS = "^FO"+template.PCS.split(',')[0]+","+template.PCS.split(',')[1]+"^FWR^FD"+item.PCS+"^FS^";
		var lblGSM = "^FO"+template.GSM.split(',')[0]+","+template.GSM.split(',')[1]+"^FWR^FD"+item.GSM+"^FS^";
		var lblWEIGHT = "^FO"+template.WT.split(',')[0]+","+template.WT.split(',')[1]+"^FWR^FD"+item.Weight+"^FS^";
		var label = "^XA^CF0,60"+lblBALE+""+lblSize+""+lblPCS+""+lblGSM+""+lblWEIGHT+"^XZ";
		console.log(label);
		PrintData(label);
		res.json({'error':false,'data':[]});
		
		
	});

	app.post('/api/downloadreport',function (req,res) {
		
		var obj = JSON.parse(req.body.obj);
		console.log(obj);

		var newLine = "";
		newLine = newLine.concat("SrNo.,");
		newLine = newLine.concat("Weight,");
		newLine = newLine.concat("DateTime,");
		newLine = newLine.concat("SIZE,");
		newLine = newLine.concat("PCS,");
		newLine = newLine.concat("GSM,");
		newLine = newLine.concat("Product,");
		newLine = newLine.concat("Extra 1,");
		newLine = newLine.concat("Extra 2,");
		newLine = newLine.concat("Extra 3,");
		newLine = newLine.concat("Extra 4,");
		newLine = newLine.concat("Extra 5,");
		newLine = newLine.concat("Extra 6,\n");
		
		db.all("SELECT * FROM BatchData where BatchID = "+obj.ID+" order by ID asc", function(err, rows) {
			
			for(var i=0;i<rows.length;i++)
			{
				var d = rows[i];

				newLine = newLine.concat(d.SrNo+",");
				newLine = newLine.concat(d.Weight.toFixed(3)+",");
				newLine = newLine.concat(d.DateTime+",");
				newLine = newLine.concat(d.Size+",");
				newLine = newLine.concat(d.PCS+",");
				newLine = newLine.concat(d.GSM+",");
				newLine = newLine.concat(d.Product+",");
				newLine = newLine.concat(d.EX1+",");
				newLine = newLine.concat(d.EX2+",");
				newLine = newLine.concat(d.EX3+",");
				newLine = newLine.concat(d.EX4+",");
				newLine = newLine.concat(d.EX5+",");
				newLine = newLine.concat(d.EX6+",\n");
			}
			console.log(newLine);
			fs.writeFile("/media/pi/WEIGHT-DATA/"+obj.RefNo+".csv", newLine, (err) => {
				if (err)
				  console.log(err);
				console.log("ok");  
				res.json({'error':false,'data':[]});	
			});
		});
		
		// fs.writeFile("/media/pi/WEIGHT-DATA/"+obj.RefNo+".csv", newLine, (err) => {
		// res.json({'error':false,'data':[]});	
		
    });

	//---------------
	app.get('/downloadbatchdata', function(req, res){
		var filename = req.query.filename;
		var file = fixed_path+filename+".csv";
		res.download(file);
	});

	app.get('/api/zero',function (req,res) {
		if(port)
			port.write("z");
		res.json('');
	});

	app.get('/api/getcsv',function (req,res) {
		var filename = req.query.filename;
		fs.readFile(fixed_path+filename+".csv", function (err, data) {
			var csv = data;
			res.setHeader('Content-disposition', 'attachment; filename='+filename+'.csv');
			res.set('Content-Type', 'text/csv');
			res.status(200).send(csv);
		})
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

	app.post('/api/updateWeight',function (req,res) {
		console.log(req.body);
		var id = req.body.id;
		var awt = req.body.awt;
		var rwt = req.body.rwt;
		var diff = parseFloat(parseFloat(awt).toFixed(3) - parseFloat(rwt).toFixed(3)).toFixed(3);
		var query = "Update BatchData set AWT = "+awt+",DWT = "+diff+" where ID = "+id;
		var stmt = db.prepare(query);
		stmt.run();
		stmt.finalize();
		res.json({'error':false,'data':[]});

    });

	app.post('/api/addbatchdata',function (req,res) {
		var batchid = req.body.batchid;
        var productid = req.body.productid;
		var product = req.body.product;
		var min = req.body.min;
		var max = req.body.max;
		var awt = req.body.awt;
		var rwt = req.body.rwt;
		var stmt = db.prepare("INSERT INTO BatchData('BatchID','ProductID','Product','Min','Max','AWT','RWT') VALUES (?,?,?,?,?,?,?)");
		stmt.run(batchid,productid,product,min,max,awt,rwt);
		stmt.finalize();
		res.json({'error':false,'data':[]});
	});

	app.post('/api/addproduct',function (req,res) {
		var product = req.body.product;
		var min = req.body.min;
		var max = req.body.max;
		var rwt = req.body.rwt;

        	db.all("SELECT * FROM ProductMaster where Product = '"+product+"'", function(err, rows) {
			if(rows.length > 0)
			{
				res.json({'error':true,'message':'Product Already Exist!'});
			}
			else{
				var stmt = db.prepare("INSERT INTO ProductMaster('Product','Min','Max','RWT') VALUES (?,?,?,?)");
				stmt.run(product,min,max,rwt);
				stmt.finalize();
				// res.json({'error':false,'message':'Product created successfully.'});
				db.all("SELECT * FROM ProductMaster order by ID desc limit 1", function(err, rows) {
					res.json({'error':false,'data':rows});
				});
			}
		});
	});

	app.post('/api/updateproduct',function (req,res) {
		var id = req.body.id;
		var min = req.body.min;
		var max = req.body.max;
		var rwt = req.body.rwt;
		var query = "UPDATE ProductMaster set Min = "+min+",Max = "+max+",RWT = "+rwt+" where ID = "+id;
		var stmt = db.prepare(query);
		stmt.run();
		stmt.finalize();
		res.json({'error':false,'data':[]});
	});

	app.post('/api/getProducts',function (req,res) {
		db.all("SELECT * FROM ProductMaster order by Product desc", function(err, rows) {
			res.json({'error':false,'data':rows});
		});
    });

	
	 app.post('/api/clearalldata',function (req,res) {
	    var query = "DELETE from BatchData";
            var stmt = db.prepare(query);
            stmt.run();
            stmt.finalize();

	    query = "DELETE from BatchRecord";
            stmt = db.prepare(query);
            stmt.run();
            stmt.finalize();

	    var query = "DELETE from ProductMaster";
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
