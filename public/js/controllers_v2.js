angular.module('starter.controllers', [])

    .factory('socket', function ($rootScope) {
        var socket = io.connect('http://localhost:8081');
        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                })
            }
        };
    })

    .directive('keyshortcut', ['$rootScope','socket',function(rootScope,socket) {
            return {
                link: function ($scope, $element, $attrs,$emit) {
                    $element.bind("keydown", function (event) {
                        rootScope.$broadcast('keydown',event.which);
                    });

                    socket.on('message', function (data) {
                        data = data.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '') ;
                        //console.log(data);
			if(data.length>2)
				data = data.substr(0,data.length-3)+'.'+data.substr(data.length-3);
                        data = parseFloat(data).toFixed(3);
                        if(data.toString().split(".").length>1)
                            window.localStorage.setItem('dp',data.toString().split(".")[1].length);
                        else
                            window.localStorage.setItem('dp',3);
                        data = parseFloat(data);
                        data = data.toFixed(parseInt(window.localStorage.getItem('dp')));
                        rootScope.$broadcast('onWeightChange',data);
                    });

                    socket.on('forceprint', function (data) {
                        rootScope.$broadcast('forceprint',data);
                    });

                    socket.on('printdone', function (data) {
                        rootScope.$broadcast('printdone',data);
                    });




                }
            };
        }
    ])

    .factory('focus', function($timeout, $window) {
        return function(id) {
            $timeout(function() {
                var element = $window.document.getElementById(id);
                if(element)
                    element.focus();
            });
        };
    })

    .controller('mainctrl',function(socket,focus,$interval,$timeout,$rootScope,$scope, $http,$window,$mdDialog,$location,$q,$sce) {

        $scope.Model = {

        };

        var lastKey;

        $rootScope.$on('keydown', function (evt,data) {
            if($location.absUrl() == 'http://localhost:8081/#/dashboard')
            {
                console.log(data);
                switch (data) {
                    case 119:{
                        if(lastKey == 17){
                            $timeout(function() {
                                $scope.Model.reopenHide = !$scope.Model.reopenHide;
                            });
                        }
                        break;
                    }
                    case 76:{
                        if(lastKey == 17){
                            $timeout(function() {
                                if(window.localStorage.getItem('username')!=  undefined)
                                    $scope.screenLock();
                            });
                        }
                        break;
                    }
                    case 120:{
                        if(lastKey == 17){
                            $timeout(function() {
                                $scope.Model.csvHide = !$scope.Model.csvHide;
                            });
                        }
                        break;
                    }
                    case 107:{
                        if(lastKey == 106){
                            //$timeout(function() {
                                window.localStorage.setItem('pushbutton',false);
                            //});
                        }
                        else{
                            $timeout(function() {
                                $scope.manual();
                            });
                        }
                        break;
                    }
                    case 109:{
                        if(lastKey == 106){
                            //$timeout(function() {
                                window.localStorage.setItem('pushbutton',true);
                            //});
                        }
                        break;
                    }

                    default:
                }
                lastKey = data;
            }
        });

        $scope.Model.selectedBatch;
        var calibration_settings;
        var adminPassword = 'dpc249';
        var reOpenbatch;
        var forcePrintLimit = 1;

        var doprint = 0;
        var lastWeight = 0;
        var lastWeightData = 0;

        function allOff() {
            socket.emit("alloff",true);
        }

        function redOn() {
            socket.emit("redon",true);
        }

        function greenOn() {
            socket.emit("greenon",true);
        }

        function yellowOn() {
            socket.emit("yellowon",true);
        }

        $rootScope.$on('forceprint', function (evt,data) {
            if($scope.Model.selectedBatch.Status==1) {
                if(window.localStorage.getItem('pushbutton') == 'true')
                    $scope.manual();
            }
        });

        $rootScope.$on('printdone', function (evt,data) {
            console.log("Print Done");
            if($scope.Model.selectedBatch!= undefined && $scope.Model.selectedBatch.Status==1) {
                $scope.Model.selectedBatch.BoxCompleted = parseInt($scope.Model.selectedBatch.BoxCompleted) + 1;
                $http.get('api/updateboxcount?batch_id='+$scope.Model.selectedBatch.NB_ID+'&boxcount='+$scope.Model.selectedBatch.BoxCompleted+'&temp='+Math.random())
                    .success(function(data) {
                    })
                    .error(function(data) {
                    });

                var bCompleted = parseInt($scope.Model.selectedBatch.BoxCompleted);
                if(bCompleted == 5){
                                $http.get('/api/getMinMax?filename='+$scope.Model.selectedBatch.NB_ID+'&halfweight='+$scope.Model.selectedBatch.HalfCarton+'&temp='+Math.random())
                                    .success(function(data) {
                                        if(data.error == false){
                                            $scope.Model.selectedBatch.MinShipperWt = data.minShipperWeight;
                                            $scope.Model.selectedBatch.MaxShipperWt = data.maxShipperWeight;
                                            $scope.Model.cMin = batch.MinShipperWt.toFixed(parseInt(window.localStorage.getItem('dp')));
                                            $scope.Model.cMax = batch.MaxShipperWt.toFixed(parseInt(window.localStorage.getItem('dp')));
                                        }
                                    })
                                    .error(function(data) {
                                        console.log(data);
                                    });
                            }
            }
        });



        //var cmd = 0;
        $rootScope.$on('onWeightChange', function (evt,data) {
            if($location.absUrl() == 'http://localhost:8081/#/dashboard')
            {

                
                var weight = data;
                $scope.Model.cWeight = weight;
                lastWeightData = weight;
                lastWeight = parseFloat(data);

                
                if($scope.Model.weightScreen_hidden == true)
                  return;


                if($scope.Model.selectedBatch!= undefined && $scope.Model.selectedBatch.Status==1){
                    var bCompleted = parseInt($scope.Model.selectedBatch.BoxCompleted);
                    if(bCompleted < 5){
                        yellowOn();
                        if(lastWeight <= 0){
                            doprint = 0;
                        }
                        return;
                    }
                }

                if(lastWeight<(parseFloat($scope.Model.cMin)*0.10).toFixed(3)){
                    doprint = 0;
                }

                if(lastWeight>=parseFloat($scope.Model.cMin) && lastWeight <= parseFloat($scope.Model.cMax))
                {
                    greenOn();
                }
                else if((lastWeight>(parseFloat($scope.Model.cMin) - (parseFloat($scope.Model.cMin)*0.10).toFixed(3))) && lastWeight<parseFloat($scope.Model.cMin))
                {
                    yellowOn();
                }
                else if(lastWeight>parseFloat($scope.Model.cMax)){
                    redOn();
                }
            }
        });

        $scope.Model.networkip = '0.0.0.0';
        function getNetworkIP() {
            $http.get('/api/getip?temp='+Math.random())
                .success(function(data) {
                    $scope.Model.networkip = data[0];
                })
                .error(function(data) {
                    $scope.Model.networkip = "0.0.0.0";
                });
        }

        $scope.setDateTime = function () {
            var date_time = $scope.Model.datetimeset;
            $http({
                url: '/api/updatedate',
                method: "POST",
                data: { 'date_time':date_time}
            })
                .then(function(response) {
                        // success
                        alertPopup("Admin Settings",'Date & Time set successfully...');
                        $scope.Model.datetimeset = '';
                    },
                    function(response) { // optional
                        // failed
                        alertPopup("Admin Settings",'Something went wrong...');
                    });
        }

        $scope.$on('$viewContentLoaded', function() {

            $scope.Model.changepass = false;
            getNetworkIP();
            //window.localStorage.removeItem('username');
            //window.localStorage.removeItem('firstname');
            //window.localStorage.removeItem('lastname');
            //window.localStorage.removeItem('password');
            //window.localStorage.removeItem('id');
            //window.localStorage.removeItem('login_info');
            //window.localStorage.removeItem('reloadDashboard');
            //$scope.Model.fullnameStr = '';
            //$scope.Model.shortnameStr = '';
            //$scope.Model.isLogin = false;

            // var serverip = window.localStorage.getItem('serverip');
            // if(serverip != undefined && serverip!= null && serverip.length>0)
            //     $scope.Model.serverip = serverip;

            allOff();
            var batch = JSON.parse(window.localStorage.getItem('reloadDashboard'));
            console.log(batch);
            window.localStorage.removeItem('reloadDashboard');
            if(batch != null){
                $scope.Model.selectedBatch = batch;
                $scope.Model.cMin = batch.MinShipperWt.toFixed(parseInt(window.localStorage.getItem('dp')));
                $scope.Model.cMax = batch.MaxShipperWt.toFixed(parseInt(window.localStorage.getItem('dp')));
                var data = JSON.parse(window.localStorage.getItem('login_info'));
                window.localStorage.setItem('username',data.data.Username);
                window.localStorage.setItem('firstname',data.data.FirstName);
                window.localStorage.setItem('lastname',data.data.LastName);
                window.localStorage.setItem('password',data.data.Password);
                window.localStorage.setItem('id',data.data.ID);
                $scope.Model.fullnameStr = data.data.FirstName.toUpperCase()+' '+data.data.LastName.toUpperCase();
                $scope.Model.shortnameStr = data.data.FirstName.charAt(0).toUpperCase()+''+data.data.LastName.charAt(0).toUpperCase();
                $scope.Model.isLogin = true;
                showMainBoard();
            }
            else{
                $scope.Model.lockScreen_hidden = true;
                $scope.Model.loginScreen_hidden = true;
                $scope.Model.registerScreen_hidden = true;
                $scope.Model.weightScreen_hidden = true;
                $scope.Model.batchInfoScreen_hidden = true;
                $scope.Model.masterInfoScreen_hidden = true;
                $scope.Model.formNewBatch_hidden = true;
                $scope.Model.formMaster_hidden = true;
                $scope.Model.adminSettings_hidden = true;
                GoLogin();
            }

            $http.get('/api/getcalibrationsettings?temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        var cs = data.data;
                        calibration_settings = cs;
                        forcePrintLimit = cs.Resolution;
                    }
                })
                .error(function(data) {

                });

            $http.get('/api/getGeneralSettins?temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        adminPassword = data.data.AdminPassword;
                    }
                })
                .error(function(data) {

                });

        });
        
        $scope.adminSettings = function () {
            GoLock('Enter Admin Password','AdminSettings');
        }


        $scope.changeAdminPassword = function () {

            if($scope.Model.adminPassword.length == 0)
            {
                alertPopup("Admin Settings","Admin Password should not be empty.");
                return;
            }

            $http.get('/api/updategeneralsettings?adminpassword='+$scope.Model.adminPassword+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        adminPassword = $scope.Model.adminPassword;
                        alertPopup("Admin Settings",data.message);
                    }
                })
                .error(function(data) {

                });
        }

        $scope.updateUser = function (item) {

            if(item.Username.length == 0)
            {
                alertPopup("Admin Settings","Username should not be empty.");
                return;
            }

            if(item.Password.length == 0)
            {
                alertPopup("Admin Settings","Password should not be empty.");
                return;
            }

            $http.get('/api/updateuser?username='+item.Username+'&password='+item.Password+'&id='+item.ID+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        alertPopup("Admin Settings",data.message);
                    }
                })
                .error(function(data) {

                });
        }

        $scope.deleteUser = function (item) {

            $http.get('/api/deleteuser?username='+item.Username+'&password='+item.Password+'&id='+item.ID+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        alertPopup("Admin Settings",data.message);
                        $scope.Model.users = [];
                        $http.get('/api/getusers?temp='+Math.random())
                            .success(function(data) {
                                if(data.error == false){
                                    $scope.Model.users = data.data;
                                }
                            })
                            .error(function(data) {

                            });
                    }
                })
                .error(function(data) {

                });
        }

        function RunAdminSettings() {

            $scope.Model.users = [];

            $scope.Model.adminPassword = adminPassword;
            $http.get('/api/getusers?temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        $scope.Model.users = data.data;
                    }
                })
                .error(function(data) {

                });

            $http.get('/api/getcalibrationsettings?temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        var cs = data.data;
                        calibration_settings = cs;

                        if(cs.ZeroCount == 0){
                            $scope.Model.buzzer = "OFF";
                        }
                        else{
                            $scope.Model.buzzer = "ON";
                        }

                        if(cs.CalibrationWeight == 1){
                            $scope.Model.timeformat = "OFF";
                        }
                        else{
                            $scope.Model.timeformat = "ON";
                        }

                        
                        $scope.Model.cap = cs.Capacity;
                        $scope.Model.res = cs.Resolution;
                        $scope.Model.zerp = cs.ZeroCount;
                        $scope.Model.cw = cs.CalibrationWeight;
                        $scope.Model.dp = cs.DecimalPoint;
                    }
                })
                .error(function(data) {

                });

            // var serverip = window.localStorage.getItem('serverip');
            // if(serverip != undefined && serverip!= null && serverip.length>0)
            //     $scope.Model.serverip = serverip;
            $scope.Model.lockScreen_hidden = true;
            $scope.Model.loginScreen_hidden = true;
            $scope.Model.registerScreen_hidden = true;
            $scope.Model.weightScreen_hidden = true;
            $scope.Model.batchInfoScreen_hidden = true;
            $scope.Model.masterInfoScreen_hidden = true;
            $scope.Model.formNewBatch_hidden = true;
            $scope.Model.formMaster_hidden = true;
            $scope.Model.adminSettings_hidden = false;
        }


        $scope.cap = function () {
            $http.get('/api/cap?data='+$scope.Model.cap+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        alertPopup("Weight Calibration",data.message);
                        //$scope.adminSettings();
                    }
                })
                .error(function(data) {

                });
        }

        // $scope.setServerip = function () {
        //     window.localStorage.setItem('serverip',$scope.Model.serverip);
        //     alertPopup("Server IP","Saved Successfully... Please reboot the machine");
        // }



        $scope.res = function () {

            $http.get('/api/res?data='+$scope.Model.res+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        //alertPopup("Weight Calibration",data.message);
                        alertPopup("Force Print Limit changed...");
                        //$scope.adminSettings();
                    }
                })
                .error(function(data) {

                });
        }
        $scope.zerp = function () {

            var buzzerValue = 1;
            if($scope.Model.buzzer == "OFF"){
                buzzerValue = 1;
                $scope.Model.buzzer = "ON";
            }
            else{
                buzzerValue = 0;
                $scope.Model.buzzer = "OFF";
            }
            
            $http.get('/api/zerp?data='+buzzerValue+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        //alertPopup("Admin Settings",data.message);
                        alertPopup("Buzzer settings changed ...");
                        //$scope.adminSettings();
                    }
                })
                .error(function(data) {

                });
        }

        $scope.dp = function () {

            $http.get('/api/dpupdate?data='+$scope.Model.dp+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        alertPopup("Admin Settings",data.message);
                        //$scope.adminSettings();
                    }
                })
                .error(function(data) {

                });
        }
        $scope.cw = function () {

            var timeformat = 1;
            if($scope.Model.timeformat == "ON"){
                timeformat = 1;
                $scope.Model.timeformat = "OFF";
            }
            else{
                timeformat = 0;
                $scope.Model.timeformat = "ON";
            }

            $http.get('/api/cw?data='+timeformat+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        //alertPopup("Admin Settings",data.message);
                        alertPopup("Time settings changed ...");
                        //$scope.adminSettings();
                    }
                })
                .error(function(data) {

                });
        }
        
        $scope.reset = function () {
            $http.get('/api/resetcalibration?temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        alertPopup("Weight Calibration",data.message);
                        $scope.adminSettings();
                    }
                })
                .error(function(data) {

                });
        }

        $scope.zero = function () {
            $http.get('/api/zero?temp='+Math.random())
                .success(function(data) {

                })
                .error(function(data) {

                });
        }

        $scope.manual = function () {
            var bCompleted = parseInt($scope.Model.selectedBatch.BoxCompleted);
            //console.log($scope.Model.selectedBatch);
            if($scope.Model.selectedBatch!= undefined && $scope.Model.selectedBatch.Status==1){

                if(parseInt($scope.Model.selectedBatch.BoxQty) == bCompleted)
                    return;

                if(bCompleted < 5){
                    if(doprint == 0){
                        if(lastWeight > 0.050){
                            doprint = 1;
                            greenOn();
                            $timeout(function () {
                                socket.emit("printweight",{"weight":lastWeightData,"format":$scope.Model.selectedBatch.PrintFormat,"data":$scope.Model.selectedBatch,"wn":window.localStorage.getItem('wn'),"shift":window.localStorage.getItem('shift')});
                            },1000);
                        }
                    }
                }
                else{
                    var limit = parseInt(forcePrintLimit)/100;
                    //alert(limit);
                    if((lastWeight>=(parseFloat($scope.Model.cMin) - (parseFloat($scope.Model.cMin)*limit).toFixed(3))) && (lastWeight<=(parseFloat($scope.Model.cMax) + parseFloat((parseFloat($scope.Model.cMax)*limit).toFixed(3))))){
                        if(doprint == 0){
                            doprint = 1;
                            greenOn();
                            $timeout(function () {
                                socket.emit("printweight",{"weight":lastWeightData,"format":$scope.Model.selectedBatch.PrintFormat,"data":$scope.Model.selectedBatch,"wn":window.localStorage.getItem('wn'),"shift":window.localStorage.getItem('shift')});
                            },1000);
                        }
                    }
                }
            }
        }


        $scope.duplicate = function() {

            //alert($scope.Model.dupShipper);
            $http.get('/api/getDuplicateRecord?filename='+$scope.Model.selectedBatch.NB_ID+'&record='+$scope.Model.dupShipper+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                         // var weight = data.weight;
                         // if(weight != '-1'){
                         //     socket.emit("duplicateprint",{"weight":weight,"format":$scope.Model.selectedBatch.PrintFormat,"shipperno":$scope.Model.dupShipper,"data":$scope.Model.selectedBatch,"shift":data.shift,"packedby":data.packedby,"date_time":data.date_time});
                         // }

                        var data = data.data;
                        for(var i=0;i<data.length;i++){
                           var record = data[i];
                           if(record.weight != '-1'){
                               socket.emit("duplicateprint",{"weight":record.weight,"format":$scope.Model.selectedBatch.PrintFormat,"shipperno":record.shipper_no,"data":$scope.Model.selectedBatch,"wn":window.localStorage.getItem('wn'),"shift":record.shift,"packedby":record.packedby,"date_time":record.date_time});
                           }
                        }
                    }
                    $scope.Model.dupShipper = "";
                })
            .error(function(data) {
                console.log(data);
            });
            
        }
        
        $scope.forcePrinter = function () {

            GoLock('Enter Password','ForcePrint');
        }

        function forceP(){
            var bCompleted = parseInt($scope.Model.selectedBatch.BoxCompleted);

            if(parseInt($scope.Model.selectedBatch.BoxQty) == bCompleted)
                return;
            
            if(bCompleted < 5){
                return;
            }
            console.log($scope.Model.selectedBatch);
            if($scope.Model.selectedBatch!= undefined && $scope.Model.selectedBatch.Status==1){

                //var limit = 1;
                console.log(doprint);
                //if((lastWeight>=(parseFloat($scope.Model.cMin) - (parseFloat($scope.Model.cMin)*limit).toFixed(3))) && (lastWeight<=(parseFloat($scope.Model.cMax) + parseFloat((parseFloat($scope.Model.cMax)*limit).toFixed(3))))){
                    if(doprint == 0){
                        console.log('force print');
                        doprint = 1;
                        greenOn();
                        //$scope.Model.selectedBatch.BoxCompleted = parseInt($scope.Model.selectedBatch.BoxCompleted) + 1;
                        $timeout(function () {
                            //$scope.Model.selectedBatch.BoxCompleted = parseInt($scope.Model.selectedBatch.BoxCompleted) + 1;
                            //socket.emit("printweight",{"weight":lastWeightData,"format":$scope.Model.selectedBatch.PrintFormat,"data":$scope.Model.selectedBatch,"wn":window.localStorage.getItem('wn'),"shift":window.localStorage.getItem('shift')});
                            socket.emit("printweight",{"weight":lastWeightData+"*","format":$scope.Model.selectedBatch.PrintFormat,"data":$scope.Model.selectedBatch,"wn":window.localStorage.getItem('wn'),"shift":window.localStorage.getItem('shift')});
                            // $http.get('api/updateboxcount?batch_id='+$scope.Model.selectedBatch.NB_ID+'&boxcount='+$scope.Model.selectedBatch.BoxCompleted+'&temp='+Math.random())
                            //     .success(function(data) {
                            //     })
                            //     .error(function(data) {
                            //     });
                        },1000);
                        
                    }
                //}
            }
        }
        
        GoLock = function (msg,redirectScreen) {
            $scope.Model.isLogin = false;
            $scope.Model.lockPassword = '';
            window.localStorage.setItem('lockredirectScreen',redirectScreen);
            $scope.Model.lockmsg = msg;
            $scope.Model.lockScreen_hidden = false;
            $scope.Model.loginScreen_hidden = true;
            $scope.Model.registerScreen_hidden = true;
            $scope.Model.weightScreen_hidden = true;
            $scope.Model.batchInfoScreen_hidden = true;
            $scope.Model.masterInfoScreen_hidden = true;
            $scope.Model.formNewBatch_hidden = true;
            $scope.Model.formMaster_hidden = true;
            $scope.Model.adminSettings_hidden = true;
        }
        
        $scope.screenLock = function () {
            $scope.Model.isLogin = false;
            if($scope.Model.weightScreen_hidden == false){
                $scope.Model.lockPassword = '';
                window.localStorage.setItem('lockredirectScreen','WeightScreen');
                $scope.Model.lockmsg = "Enter your password to retrieve your session";
                $scope.Model.lockScreen_hidden = false;
                $scope.Model.loginScreen_hidden = true;
                $scope.Model.registerScreen_hidden = true;
                $scope.Model.weightScreen_hidden = false;
                $scope.Model.batchInfoScreen_hidden = true;
                $scope.Model.masterInfoScreen_hidden = true;
                $scope.Model.formNewBatch_hidden = true;
                $scope.Model.formMaster_hidden = true;
                $scope.Model.adminSettings_hidden = true;
            }
            else
                GoLock('Enter your password to retrieve your session','Dashboard');
        }

        function alertPopup(title,desc) {
            $scope.Model.title = title;
            $scope.Model.description = desc;
            $timeout(function() {
                jQuery('#myModal').modal();
            });
        }


        $scope.openLock = function () {

            if($scope.Model.lockPassword == undefined || $scope.Model.lockPassword.length == 0)
            {
                alertPopup("Screen Lock",'Please enter password');
                return;
            }

            var screen = window.localStorage.getItem('lockredirectScreen');
            //window.localStorage.removeItem('lockredirectScreen');
            if(screen == 'Dashboard'){
                if($scope.Model.lockPassword != window.localStorage.getItem('password'))
                {
                    alertPopup("Screen Lock",'Please enter valid password');
                    $scope.Model.lockPassword = '';
                    return;
                }
                window.localStorage.removeItem('lockredirectScreen');
                GoDashboard();
                $scope.Model.isLogin = true;
            }
            else if(screen == 'Registration'){

                if($scope.Model.lockPassword != adminPassword)
                {
                    alertPopup("Screen Lock",'Please enter valid password');
                    $scope.Model.lockPassword = '';
                    return;
                }
                window.localStorage.removeItem('lockredirectScreen');
                GoRegistration();
                $scope.Model.isLogin = true;
            }
            else if(screen == 'AdminSettings'){

                 var username = window.localStorage.getItem('username');
                 var pass = window.localStorage.getItem('password');

                 if($scope.Model.lockPassword == (pass+"97413") && username == 'admin'){

                        $scope.Model.changepass = true;
                        window.localStorage.removeItem('lockredirectScreen');
                        RunAdminSettings();
                        $scope.Model.isLogin = true;
                        

                 }
                 else if($scope.Model.lockPassword == pass && username == 'admin'){
                        
                        window.localStorage.removeItem('lockredirectScreen');
                        RunAdminSettings();
                        $scope.Model.isLogin = true;

                 }
                 else{
                    alertPopup("Screen Lock",'Please enter valid password');
                    $scope.Model.lockPassword = '';
                    return;
                }
                 
            }
            else if(screen == 'CreateNewBatch'){
                if($scope.Model.lockPassword != window.localStorage.getItem('password'))
                {
                    alertPopup("Screen Lock",'Please enter valid password');
                    $scope.Model.lockPassword = '';
                    return;
                }
                window.localStorage.removeItem('lockredirectScreen');
                CreateNewBatch();
                $scope.Model.isLogin = true;
            }
            else if(screen == 'MasterRecord'){


                 var username = window.localStorage.getItem('username');
                 var pass = window.localStorage.getItem('password');

                 if($scope.Model.lockPassword == pass && username == 'admin'){
                        
                        window.localStorage.removeItem('lockredirectScreen');
                        MasterRecord();
                        $scope.Model.isLogin = true;

                 }
                 else{
                    alertPopup("Screen Lock",'Please enter valid password');
                    $scope.Model.lockPassword = '';
                    return;
                 }
                
                if($scope.Model.lockPassword != window.localStorage.getItem('password'))
                {
                    alertPopup("Screen Lock",'Please enter valid password');
                    $scope.Model.lockPassword = '';
                    return;
                }
                
            }
            else if(screen == 'WeightScreen'){
                if($scope.Model.lockPassword != window.localStorage.getItem('password'))
                {
                    alertPopup("Screen Lock",'Please enter valid password');
                    $scope.Model.lockPassword = '';
                    return;
                }
                window.localStorage.removeItem('lockredirectScreen');
                showMainBoard();
                $scope.Model.isLogin = true;
            }
            else if(screen == 'ForcePrint'){
                if($scope.Model.lockPassword != window.localStorage.getItem('password'))
                {
                    alertPopup("Screen Lock",'Please enter valid password');
                    $scope.Model.lockPassword = '';
                    return;
                }
                window.localStorage.removeItem('lockredirectScreen');
                showMainBoard();
                forceP();
                $scope.Model.isLogin = true;
            }
            else if(screen == 'ReOpen'){
                if($scope.Model.lockPassword != adminPassword)
                {
                    alertPopup("Screen Lock",'Please enter valid password');
                    $scope.Model.lockPassword = '';
                    return;
                }
                window.localStorage.removeItem('lockredirectScreen');
                var id = reOpenbatch.NB_ID;
                $http.get('/api/updateBatchStatus?batchID='+id+'&status=1&batch_no='+reOpenbatch.MfgNo+'&temp='+Math.random())
                    .success(function(data) {
                        $scope.batchFilter(-1);
                        $scope.Model.isLogin = true;
                    })
                    .error(function(data) {

                    });
            }
        }

        GoLogin = function () {
            $scope.Model.username = '';
            $scope.Model.password = '';
            $scope.Model.workername = ''
            window.localStorage.setItem('dp',3);

            $scope.Model.lockScreen_hidden = true;
            $scope.Model.loginScreen_hidden = false;
            $scope.Model.registerScreen_hidden = true;
            $scope.Model.weightScreen_hidden = true;
            $scope.Model.batchInfoScreen_hidden = true;
            $scope.Model.masterInfoScreen_hidden = true;
            $scope.Model.formNewBatch_hidden = true;
            $scope.Model.formMaster_hidden = true;
            $scope.Model.adminSettings_hidden = true;
            $location.path('/dashboard');
        }

        GoRegistration = function () {
            $scope.Model.isLogin = false;
            $scope.Model.username_reg = '';
            $scope.Model.password_reg = '';
            $scope.Model.repassword = '';
            $scope.Model.firstname = '';
            $scope.Model.lastname = '';
            $scope.Model.lockScreen_hidden = true;
            $scope.Model.loginScreen_hidden = true;
            $scope.Model.registerScreen_hidden = false;
            $scope.Model.weightScreen_hidden = true;
            $scope.Model.batchInfoScreen_hidden = true;
            $scope.Model.masterInfoScreen_hidden = true;
            $scope.Model.formNewBatch_hidden = true;
            $scope.Model.formMaster_hidden = true;
            $scope.Model.adminSettings_hidden = true;
            $location.path('/dashboard');
        }

        GoDashboard = function () {
            $scope.Model.lockScreen_hidden = true;
            $scope.Model.loginScreen_hidden = true;
            $scope.Model.registerScreen_hidden = true;
            $scope.Model.weightScreen_hidden = true;
            $scope.Model.batchInfoScreen_hidden = true;
            $scope.Model.masterInfoScreen_hidden = true;
            $scope.Model.formNewBatch_hidden = true;
            $scope.Model.formMaster_hidden = true;
            $scope.Model.adminSettings_hidden = true;
            $location.path('/dashboard');
        }

        $scope.clearLogin = function () {
            $scope.Model.username = '';
            $scope.Model.password = '';
            $scope.Model.workername = '';
            $scope.shift_time = '';
            $scope.Model.username_reg = '';
            $scope.Model.password_reg = '';
            $scope.Model.repassword = '';
            $scope.Model.firstname = '';
            $scope.Model.lastname = '';
        }

        var wn = '';
        $scope.login = function () {
            if($scope.Model.username == undefined || $scope.Model.username.length == 0)
            {
                alertPopup("Login",'Please enter username');
                return;
            }
            if($scope.Model.password == undefined || $scope.Model.password.length == 0)
            {
                alertPopup("Login",'Please enter password');
                return;
            }
            if($scope.shift_time == undefined || $scope.shift_time.length == 0)
            {
                alertPopup("Login",'Please select shift time');
                return;
            }

            if($scope.Model.workername == undefined || $scope.Model.workername.length == 0)
            {
                alertPopup("Login",'Please enter worker name');
                return;
            }
            // if($scope.Model.serverip == undefined || $scope.Model.serverip.length == 0)
            // {
            //     alertPopup("Server IP",'Please enter Server IP Address');
            //     return;
            // }

            window.localStorage.setItem('shift',$scope.shift_time);
            wn = $scope.Model.workername;
            window.localStorage.setItem('wn',wn);
            window.localStorage.setItem('pushbutton',true);
            $http.get('/api/checkLogin?username='+$scope.Model.username+'&password='+$scope.Model.password+'&lastname='+$scope.Model.lastname+'&workername='+$scope.Model.workername+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        alertPopup("Login",data.message);
                        GoDashboard();
                        window.localStorage.setItem('login_info',JSON.stringify(data));
                        window.localStorage.setItem('username',data.data.Username);
                        window.localStorage.setItem('firstname',data.data.FirstName);
                        window.localStorage.setItem('lastname',data.data.LastName);
                        window.localStorage.setItem('password',data.data.Password);
                        window.localStorage.setItem('id',data.data.ID);
                        //window.localStorage.setItem('serverip',$scope.Model.serverip);
                        $scope.Model.fullnameStr = data.data.FirstName.toUpperCase()+' '+data.data.LastName.toUpperCase();
                        $scope.Model.shortnameStr = data.data.FirstName.charAt(0).toUpperCase()+''+data.data.LastName.charAt(0).toUpperCase();
                        $scope.Model.isLogin = true;
                    }
                    else{
                        alertPopup("Error",data.message);
                    }
                })
                .error(function(data) {
                    console.log(data);
                });

        }

        $scope.registration = function () {

            if($scope.Model.firstname == undefined || $scope.Model.firstname.length == 0)
            {
                alertPopup("Registration",'Please enter first name');
                return;
            }
            if($scope.Model.lastname == undefined || $scope.Model.lastname.length == 0)
            {
                alertPopup("Registration",'Please enter last name');
                return;
            }
            if($scope.Model.username_reg == undefined || $scope.Model.username_reg.length == 0)
            {
                alertPopup("Registration",'Please enter username');
                return;
            }
            if($scope.Model.password_reg == undefined || $scope.Model.password_reg.length == 0)
            {
                alertPopup("Registration",'Please enter password');
                return;
            }
            if($scope.Model.repassword == undefined || $scope.Model.repassword.length == 0)
            {
                alertPopup("Registration",'Please enter repeat password');
                return;
            }
            if($scope.Model.repassword != $scope.Model.password_reg)
            {
                alertPopup("Registration",'Please enter valid repeat password');
                return;
            }

            $http.get('/api/addNewUser?username='+$scope.Model.username_reg+'&firstname='+$scope.Model.firstname+'&lastname='+$scope.Model.lastname+'&password='+$scope.Model.password_reg+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        alertPopup("Registration",data.message);
                        GoLogin();
                    }
                    else{
                        alertPopup("Error",data.message);
                    }
                })
                .error(function(data) {
                    console.log(data);
                });
        }

        $scope.goRegistration = function () {
            GoLock('Enter Admin Password','Registration');
        }

        $scope.goLogin = function () {
            GoLogin();
        }
        
        $scope.logout = function () {
            window.localStorage.removeItem('username');
            window.localStorage.removeItem('firstname');
            window.localStorage.removeItem('lastname');
            window.localStorage.removeItem('password');
            window.localStorage.removeItem('id');
            window.localStorage.removeItem('login_info');
            window.localStorage.removeItem('reloadDashboard');
            $scope.Model.fullnameStr = '';
            $scope.Model.shortnameStr = '';
            $scope.Model.isLogin = false;
            GoLogin();
        }
        
        $scope.dashboard = function () {
            GoDashboard();
        }

        $scope.reloadProducts = function (master_record) {

            $scope.Model.productsInMaster = [];
            $http.get('/api/getProductRecords?masterNumber='+master_record+'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        for(var i =0;i<data.data.length;i++){
                            $scope.Model.productsInMaster.push(data.data[i].ProductName);
                        }
                    }
                })
                .error(function(data) {

                });
        }

        $scope.editBatch = function (batch) {
            $scope.Model.csvHide = false;
            window.localStorage.setItem('batch_id',batch.NB_ID);
            window.localStorage.setItem('editbatch',JSON.stringify(batch));
            $scope.createNewBatch();
        }

        $scope.createNewBatch = function () {
            GoLock('Enter Password','CreateNewBatch');
        }

        function CreateNewBatch() {
            $scope.Model.batchMasterRecords = [];
            $http.get('/api/getMasterRecords?temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        for(var i =0;i<data.data.length;i++){
                            $scope.Model.batchMasterRecords.push(data.data[i].MasterNumber);
                        }
                    }

                    if(window.localStorage.getItem('editbatch') != undefined){
                        var obj_batch = JSON.parse(window.localStorage.getItem('editbatch'));

                        window.localStorage.removeItem('editbatch');
                        $scope.Model.editedBatchNumber = obj_batch.NB_ID;

                        $scope.master_record = obj_batch.MasterNumber;
                        $scope.product = obj_batch.ProductName;

                        $scope.Model.mfgNo = obj_batch.MfgNo;
                        $scope.Model.mfgLicNo = obj_batch.MfgLicNo;
                        $scope.Model.mfgDate = obj_batch.MfgDate;
                        $scope.Model.expDate = obj_batch.ExpDate;
                        $scope.Model.minShipperWt = obj_batch.MinShipperWt;
                        $scope.Model.maxShipperWt = obj_batch.MaxShipperWt;
                        $scope.Model.halfCarton = obj_batch.HalfCarton;
                        $scope.Model.boxQty = obj_batch.BoxQty;
                        $scope.Model.countryName = obj_batch.CountryName;

                        $scope.Model.productsInMaster = [];
                        $http.get('/api/getProductRecords?masterNumber='+$scope.master_record+'&temp='+Math.random())
                            .success(function(data) {
                                console.log(data);
                                if(data.error == false){
                                    for(var i =0;i<data.data.length;i++){
                                        $scope.Model.productsInMaster.push(data.data[i].ProductName);
                                    }
                                }
                            })
                            .error(function(data) {

                            });
                    }
                    else{
                        $scope.master_record = '';
                        $scope.product = '';
                        $scope.Model.editedBatchNumber = -1;
                        $scope.Model.mfgNo = '';
                        $scope.Model.mfgLicNo = '';
                        $scope.Model.mfgDate = '';
                        $scope.Model.expDate = '';
                        $scope.Model.minShipperWt = '';
                        $scope.Model.maxShipperWt = '';
                        $scope.Model.halfCarton = '';
                        $scope.Model.boxQty = '';
                        $scope.Model.shipperNo = '';
                        $scope.Model.countryName = '';

                        $scope.Model.productsInMaster = [];
                    }

                })
                .error(function(data) {

                });

            $scope.Model.lockScreen_hidden = true;
            $scope.Model.loginScreen_hidden = true;
            $scope.Model.registerScreen_hidden = true;
            $scope.Model.weightScreen_hidden = true;
            $scope.Model.batchInfoScreen_hidden = true;
            $scope.Model.masterInfoScreen_hidden = true;
            $scope.Model.formNewBatch_hidden = false;
            $scope.Model.formMaster_hidden = true;
            $scope.Model.adminSettings_hidden = true;
        }

        $scope.editMaster = function (master) {
            window.localStorage.setItem('editmaster',JSON.stringify(master));
            $scope.masterRecord();
        }

        $scope.masterRecord = function () {
            GoLock('Enter Password','MasterRecord');
        }

        $scope.recordMasterList = function () {

            $scope.Model.all_master_records = [];
            $http.get('/api/getAllMasterRecords?temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        for(var i =0;i<data.data.length;i++){
                            $scope.Model.all_master_records.push(data.data[i]);
                        }
                        //console.log($scope.Model.all_master_records);
                    }
                })
                .error(function(data) {

                });

            $scope.Model.lockScreen_hidden = true;
            $scope.Model.loginScreen_hidden = true;
            $scope.Model.registerScreen_hidden = true;
            $scope.Model.weightScreen_hidden = true;
            $scope.Model.batchInfoScreen_hidden = true;
            $scope.Model.masterInfoScreen_hidden = false;
            $scope.Model.formNewBatch_hidden = true;
            $scope.Model.formMaster_hidden = true;
            $scope.Model.adminSettings_hidden = true;
        }

        function MasterRecord() {

            $scope.Model.printSettings = ["4x3","2x2"];
            $scope.Model.masterRecords = [];

            $http.get('/api/getMasterRecords?temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        for(var i =0;i<data.data.length;i++){
                            $scope.Model.masterRecords.push(data.data[i].MasterNumber);
                        }
                    }

                    if(window.localStorage.getItem('editmaster') != undefined){
                        var obj_master = JSON.parse(window.localStorage.getItem('editmaster'));
                        window.localStorage.removeItem('editmaster');
                        $scope.Model.newNumber = false;
                        $scope.Model.editedMasterNumber = obj_master.ID;

                        $scope.master = obj_master.MasterNumber;
                        if(obj_master.PrintFormat == 1)
                            $scope.print_format = "4x3"
                        else
                            $scope.print_format = "2x2"

                        $scope.Model.newMasterNumber = '';
                        $scope.Model.masterProductName = obj_master.ProductName;
                        $scope.Model.masterFullName1 = obj_master.FullName1;
                        $scope.Model.masterFullName2 = obj_master.FullName2;
                        $scope.Model.masterBoxDetails = obj_master.BoxDetails;
                        $scope.Model.masterRemarks1 = obj_master.Remarks1;
                        $scope.Model.masterRemarks2 = obj_master.Remarks2;
                        $scope.Model.masterRemarks3 = obj_master.Remarks3;
                    }
                    else{
                        $scope.Model.newNumber = true;
                        $scope.Model.editedMasterNumber = -1;

                        $scope.master = '';
                        $scope.print_format = ''
                        $scope.Model.newMasterNumber = '';
                        $scope.Model.masterProductName = '';
                        $scope.Model.masterFullName1 = '';
                        $scope.Model.masterFullName2 = '';
                        $scope.Model.masterBoxDetails = '';
                        $scope.Model.masterRemarks1 = '';
                        $scope.Model.masterRemarks2 = '';
                        $scope.Model.masterRemarks3 = '';
                    }
                })
                .error(function(data) {

                });

            $scope.Model.lockScreen_hidden = true;
            $scope.Model.loginScreen_hidden = true;
            $scope.Model.registerScreen_hidden = true;
            $scope.Model.weightScreen_hidden = true;
            $scope.Model.batchInfoScreen_hidden = true;
            $scope.Model.masterInfoScreen_hidden = true;
            $scope.Model.formNewBatch_hidden = true;
            $scope.Model.formMaster_hidden = false;
            $scope.Model.adminSettings_hidden = true;
        }

        $scope.batchFilter = function (status) {

            $scope.Model.all_batch_records = [];
            $http.get('/api/getAllBatchRecords?temp='+Math.random())
            .success(function(data) {
                if(data.error == false){
                    console.log(data.data);
                    var totalOnHold = 0;
                    var totalCompleted = 0;
                    if(data.data.length>0)
                        $scope.Model.totalAll = data.data.length;
                    else
                        $scope.Model.totalAll = 0;
                    for(var i =0;i<data.data.length;i++){
                        if(status == -1)
                            $scope.Model.all_batch_records.push(data.data[i]);
                        else if(data.data[i].Status == status){
                            $scope.Model.all_batch_records.push(data.data[i]);
                        }

                        if(data.data[i].Status == 2){
                            totalOnHold++;
                        }
                        if(data.data[i].Status == 3){
                            totalCompleted++;
                        }
                    }
                    $scope.Model.totalOnHold = totalOnHold;
                    $scope.Model.totalCompleted = totalCompleted;
                }
                else{
                    $scope.Model.totalOnHold = 0;
                    $scope.Model.totalCompleted = 0;
                    $scope.Model.totalAll = 0;
                }
            })
            .error(function(data) {

            });

            $scope.Model.reopenHide = false;
            $scope.Model.lockScreen_hidden = true;
            $scope.Model.loginScreen_hidden = true;
            $scope.Model.registerScreen_hidden = true;
            $scope.Model.weightScreen_hidden = true;
            $scope.Model.batchInfoScreen_hidden = false;
            $scope.Model.masterInfoScreen_hidden = true;
            $scope.Model.formNewBatch_hidden = true;
            $scope.Model.formMaster_hidden = true;
            $scope.Model.adminSettings_hidden = true;
        }

        $scope.changeBatchStatus = function (batch) {
            var id = batch.NB_ID;
            $http.get('/api/updateBatchStatus?batchID='+id+'&status='+batch.Status+'&batch_no='+batch.MfgNo+'&temp='+Math.random())
                .success(function(data) {
                    $scope.batchFilter(-1);
                })
                .error(function(data) {

                });
        }

    $scope.reopenBatch = function (batch) {
            reOpenbatch = batch;
            GoLock('Enter Admin Password','ReOpen');
    }

    $scope.openCSV = function () {
        if(window.localStorage.getItem('batch_id') != undefined) {
            var obj_batch_id = window.localStorage.getItem('batch_id');
            console.log(obj_batch_id);
            $http.get('/api/opencsv?batchID='+obj_batch_id+'&temp='+Math.random())
                .success(function(data) {

                })
                .error(function(data) {

                });
        }
    }

    $scope.testprint = function (batch) {
            socket.emit("testprint",{"weight":lastWeightData,"format":batch.PrintFormat,"data":batch,"wn":window.localStorage.getItem('wn'),"shift":window.localStorage.getItem('shift')});
        }
        
        $scope.changeBatchComplete = function (batch) {
            var id = batch.NB_ID;
            $timeout(function () {
                //socket.emit("batchcomplete",{"data":batch});
                //socket1.emit("batchcomplete",{"data":batch});
            },1000);
            $http.get('/api/updateBatchStatusComplete?batchID='+id+'&temp='+Math.random())
                .success(function(data) {
                    $scope.batchFilter(-1);
                })
                .error(function(data) {

                });
        }
        $scope.viewBatch = function (batch) {
            doprint = 1;
            $scope.Model.selectedBatch = batch;
            window.localStorage.setItem('reloadDashboard',JSON.stringify(batch));
            showMainBoard();
            location.reload();
            //$location.path('/home');
        }

        function showMainBoard() {
            $scope.Model.lockScreen_hidden = true;
            $scope.Model.loginScreen_hidden = true;
            $scope.Model.registerScreen_hidden = true;
            $scope.Model.weightScreen_hidden = false;
            $scope.Model.batchInfoScreen_hidden = true;
            $scope.Model.masterInfoScreen_hidden = true;
            $scope.Model.formNewBatch_hidden = true;
            $scope.Model.formMaster_hidden = true;
            $scope.Model.adminSettings_hidden = true;
        }

        $scope.saveMaster = function () {

            if($scope.Model.editedMasterNumber == -1){
                if($scope.master == undefined && ($scope.Model.newMasterNumber == undefined || $scope.Model.newMasterNumber.length==0))
                {
                    alertPopup("Master Record",'Please select master record or Add new record');
                    return;
                }

                if($scope.Model.masterProductName == undefined || $scope.Model.masterProductName.length==0)
                {
                    alertPopup("Master Record",'Please enter product name');
                    return;
                }

                if($scope.print_format == undefined)
                {
                    alertPopup("Master Record",'Please select print format');
                    return;
                }

                var masterNumber = $scope.master;
                var newMasterNumber = $scope.Model.newMasterNumber.toUpperCase();
                var productName = $scope.Model.masterProductName;
                var fullName1 = $scope.Model.masterFullName1;
                var fullName2 = $scope.Model.masterFullName2;
                var boxDetails = $scope.Model.masterBoxDetails;
                var remarks1 = $scope.Model.masterRemarks1;
                var remarks2 = $scope.Model.masterRemarks2;
                var remarks3 = $scope.Model.masterRemarks3;
                var value = 1;
                if($scope.print_format != undefined){
                    var value = 1;
                    if($scope.print_format == '2x2')
                        value = 2;
                    else
                        value = 1;
                }

                $http.get('/api/addNewMasterRecord?masterNumber='+masterNumber+'&newMasterNumber='+newMasterNumber+'&productName='+productName+'&fullName1='+fullName1+'&fullName2='+fullName2+'&boxDetails='+boxDetails+'&remarks1='+remarks1+'&remarks2='+remarks2+'&remarks3='+remarks3+'&print_format='+value+'&temp='+Math.random())
                    .success(function(data) {
                        if(data.error == false && data.master_record_error == false){
                            alertPopup("Master Record",data.message);
                            $scope.recordMasterList();
                        }
                        else if(data.master_record_error == true){
                            alertPopup("Error",data.message);
                        }
                        else{
                            alertPopup("Error",data.message);
                        }
                    })
                    .error(function(data) {
                        console.log(data);
                    });
            }
            else {
                if($scope.master == undefined || $scope.master.length==0)
                {
                    alertPopup("Master Record",'Please select master record');
                    return;
                }

                if($scope.Model.masterProductName == undefined || $scope.Model.masterProductName.length==0)
                {
                    alertPopup("Master Record",'Please enter product name');
                    return;
                }

                if($scope.print_format == undefined)
                {
                    alertPopup("Master Record",'Please select print format');
                    return;
                }

                var master_id = $scope.Model.editedMasterNumber;
                var masterNumber = $scope.master;
                var productName = $scope.Model.masterProductName;
                var fullName1 = $scope.Model.masterFullName1;
                var fullName2 = $scope.Model.masterFullName2;
                var boxDetails = $scope.Model.masterBoxDetails;
                var remarks1 = $scope.Model.masterRemarks1;
                var remarks2 = $scope.Model.masterRemarks2;
                var remarks3 = $scope.Model.masterRemarks3;
                var value = 1;
                if($scope.print_format != undefined){
                    var value = 1;
                    if($scope.print_format == '2x2')
                        value = 2;
                    else
                        value = 1;
                }

                $http.get('/api/updateMasterRecord?masterNumber='+masterNumber+'&master_id='+master_id+'&productName='+productName+'&fullName1='+fullName1+'&fullName2='+fullName2+'&boxDetails='+boxDetails+'&remarks1='+remarks1+'&remarks2='+remarks2+'&remarks3='+remarks3+'&print_format='+value+'&temp='+Math.random())
                    .success(function(data) {
                        if(data.error == false && data.master_record_error == false){
                            alertPopup("Master Record",data.message);
                            $scope.recordMasterList();
                        }
                        else if(data.master_record_error == true){
                            alertPopup("Error",data.message);
                        }
                        else{
                            alertPopup("Error",data.message);
                        }
                    })
                    .error(function(data) {
                        console.log(data);
                    });
            }

        }
        
        $scope.saveBatch = function () {

            if($scope.master_record == undefined || $scope.master_record.length==0)
            {
                alertPopup("New Batch",'Please select master record number');
                return;
            }

            if($scope.product == undefined || $scope.product.length==0)
            {
                alertPopup("New Batch",'Please select product');
                return;
            }

            if($scope.Model.mfgNo == undefined || $scope.Model.mfgNo.length==0)
            {
                alertPopup("New Batch",'Please enter batch No');
                return;
            }

            if($scope.Model.mfgLicNo == undefined || $scope.Model.mfgLicNo.length==0)
            {
                alertPopup("New Batch",'Please enter Mfg Lic No');
                return;
            }

            if($scope.Model.mfgDate == undefined || $scope.Model.mfgDate.length==0)
            {
                alertPopup("New Batch",'Please enter Mfg Date');
                return;
            }

            if($scope.Model.expDate == undefined || $scope.Model.expDate.length==0)
            {
                alertPopup("New Batch",'Please enter Expiry Date');
                return;
            }

            if($scope.Model.halfCarton == undefined || $scope.Model.halfCarton.length==0)
            {
                alertPopup("New Batch",'Please enter half carton weight.');
                return;
            }

            if($scope.Model.boxQty == undefined || $scope.Model.boxQty.length==0)
            {
                alertPopup("New Batch",'Please enter total Box Quantity');
                return;
            }

            // if($scope.Model.shipperNo == undefined || $scope.Model.shipperNo.length==0)
            // {
            //     alertPopup("New Batch",'Please enter Shipper No');
            //     return;
            // }

            if($scope.Model.countryName == undefined || $scope.Model.countryName.length==0)
            {
                alertPopup("New Batch",'Please enter country name');
                return;
            }

            // if($scope.user == undefined || $scope.user.length==0)
            // {
            //     alertPopup("New Batch",'Please select user');
            //     return;
            // }

            var masterNumber = $scope.master_record;
            var productName = $scope.product;
            var mfgNo = $scope.Model.mfgNo;
            var mfgLicNo = $scope.Model.mfgLicNo;
            var mfgDate = $scope.Model.mfgDate;
            var expDate = $scope.Model.expDate;
            var minShipperWt = "0.000";
            var maxShipperWt = "0.000";
            if($scope.Model.editedBatchNumber == -1){
                minShipperWt = "0.000";
                maxShipperWt = "0.000";
            }
            else{
                minShipperWt = $scope.Model.minShipperWt.toFixed(parseInt(window.localStorage.getItem('dp')));
                maxShipperWt = $scope.Model.maxShipperWt.toFixed(parseInt(window.localStorage.getItem('dp')));
            }
            var boxQty = $scope.Model.boxQty;
            var shipperNo = 0;//$scope.Model.shipperNo;
            var countryName = $scope.Model.countryName;
            var username = $scope.Model.workername;
            var halfCarton = $scope.Model.halfCarton.toFixed(parseInt(window.localStorage.getItem('dp')));

            $http.get('/api/addNewBatch?masterNumber='+masterNumber
                +'&productName='+productName+'&mfgNo='+mfgNo
                +'&mfgLicNo='+mfgLicNo
                +'&mfgDate='+mfgDate
                +'&expDate='+expDate+'&minShipperWt='+minShipperWt+'&maxShipperWt='
                +maxShipperWt+'&boxQty='+boxQty+'&shipperNo='+shipperNo
                +'&countryName='+countryName
                +'&username='+username
                +'&halfcarton='+halfCarton
                +'&editbatchnumber='+$scope.Model.editedBatchNumber
                +'&temp='+Math.random())
                .success(function(data) {
                    if(data.error == false){
                        $timeout(function () {
                            if($scope.Model.editedBatchNumber == -1)
                                socket.emit("newbatch",{"data":data.ID});
                            //socket1.emit("newbatch",{"data":$scope.Model.mfgNo});
                        },1000);
                        alertPopup("New Batch",data.message);
                        $scope.batchFilter(-1);
                    }
                    else{
                        alert(data.message);
                        alertPopup("Error",data.message);
                    }
                })
                .error(function(data) {
                    console.log(data);
                });


        }
    })
