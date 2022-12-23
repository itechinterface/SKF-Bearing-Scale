angular.module('starter.controllers', [])

    .factory('socket', function ($rootScope) {
        return{

        };
        // var socket = io.connect('http://localhost:8081');
        // return {
        //     on: function (eventName, callback) {
        //         socket.on(eventName, function () {
        //             var args = arguments;
        //             $rootScope.$apply(function () {
        //                 callback.apply(socket, args);
        //             });
        //         });
        //     },
        //     emit: function (eventName, data, callback) {
        //         socket.emit(eventName, data, function () {
        //             var args = arguments;
        //             $rootScope.$apply(function () {
        //                 if (callback) {
        //                     callback.apply(socket, args);
        //                 }
        //             });
        //         })
        //     }
        // };
    })

    .directive('exportToCsv',function(){
        return {
          restrict: 'A',
          link: function (scope, element, attrs) {
              var el = element[0];
              element.bind('click', function(e){
                  console.log(e);
                  var table = e.target.nextElementSibling;
                  var csvString = '';
                  for(var i=0; i<table.rows.length;i++){
                      var rowData = table.rows[i].cells;
                      for(var j=0; j<rowData.length;j++){
                          csvString = csvString + rowData[j].innerHTML + ",";
                      }
                      csvString = csvString.substring(0,csvString.length - 1);
                      csvString = csvString + "\n";
                  }
                   csvString = csvString.substring(0, csvString.length - 1);
                   var a = $('<a/>', {
                      style:'display:none',
                      href:'data:application/octet-stream;base64,'+btoa(csvString),
                      download:'data.csv'
                  }).appendTo('body')
                  a[0].click()
                  a.remove();
              });
          }
        }
    })
  

   .directive('onClickAndHold', function ($parse, $timeout) {
        return {
          link: function (scope, element, attrs) {
            var clickAndHoldFn = $parse(attrs.onClickAndHold);
            var doNotTriggerClick;
            var timeoutHandler;
            element.on('mousedown', function () {
                $timeout.cancel(timeoutHandler);
                timeoutHandler = $timeout(function () {
                  clickAndHoldFn(scope, {$event: event})
                }, 10000)
            });
            element.on('mouseup', function (event) {
                $timeout.cancel(timeoutHandler);
            });
      
            if (attrs.onClick) {
                var clickFn = $parse(attrs.onClick);
                element.on('click', function (event) {
                    if (doNotTriggerClick) {
                        doNotTriggerClick = false;
                        return;
                    }
                    clickFn(scope, {$event: event});
                    scope.$apply();
                });
            }
          }
        }
      })

      .directive('onClickHold', function ($parse, $timeout) {
        return {
          link: function (scope, element, attrs) {
            var clickAndHoldFn = $parse(attrs.onClickHold);
            var doNotTriggerClick;
            var timeoutHandler;
            element.on('mousedown', function () {
                $timeout.cancel(timeoutHandler);
                timeoutHandler = $timeout(function () {
                  clickAndHoldFn(scope, {$event: event})
                }, 2000)
            });
            element.on('mouseup', function (event) {
                $timeout.cancel(timeoutHandler);
            });
      
            if (attrs.onClick) {
                var clickFn = $parse(attrs.onClick);
                element.on('click', function (event) {
                    if (doNotTriggerClick) {
                        doNotTriggerClick = false;
                        return;
                    }
                    clickFn(scope, {$event: event});
                    scope.$apply();
                });
            }
          }
        }
      })

      .directive('onClickResetHold', function ($parse, $timeout) {
        return {
          link: function (scope, element, attrs) {
            var clickAndHoldFn = $parse(attrs.onClickResetHold);
            var doNotTriggerClick;
            var timeoutHandler;
            element.on('mousedown', function () {
                $timeout.cancel(timeoutHandler);
                timeoutHandler = $timeout(function () {
                  clickAndHoldFn(scope, {$event: event})
                }, 20000)
            });
            element.on('mouseup', function (event) {
                $timeout.cancel(timeoutHandler);
            });
      
            if (attrs.onClick) {
                var clickFn = $parse(attrs.onClick);
                element.on('click', function (event) {
                    if (doNotTriggerClick) {
                        doNotTriggerClick = false;
                        return;
                    }
                    clickFn(scope, {$event: event});
                    scope.$apply();
                });
            }
          }
        }
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

    .controller('mainctrl',function(socket,focus,$interval,$timeout,$rootScope,$scope,$rootScope, $http,$window,$mdDialog,$location,$q,$sce,$filter) {

        $scope.Model = {

        };

        $scope.Model.showAdminView = false;
        $scope.Model.status = 1;
        $scope.Model.pcurl = "";
        
        $rootScope.$on('forceprint', function (evt,data) {
            
        });

        $rootScope.$on('onWeightChange', function (evt,data) {
            if($location.absUrl() == 'http://localhost:8080/#/dashboard')
            {
                var weight = data;
                $scope.Model.cWeight = weight;
            }
        });
        
        $scope.reset = function(){
            $scope.Model.BearingNo = "";
            $scope.Model.SrNo = "";
            $scope.Model.Username = "";
            $scope.Model.UserCode = "";
            $scope.Model.Extra1 = "";
            $scope.Model.Extra2 = "";
            $scope.Model.Extra3 = "";
            $scope.Model.status = 1;
            $scope.Model.BeforeWt = "";
            $scope.Model.AfterWt = "";
            $scope.Model.ResultWt = "";
            $scope.getBatchRecords();
        }

        $scope.dummy = function(){
            var srNo = prompt("Enter Bearing Sr.No.");
            if (srNo != null) {
                $scope.Model.SrNo = srNo;
                $scope.enterWeight();
            }
        }
        

        $scope.$on('$viewContentLoaded', function() {

            var url = $location.absUrl().split('?')[0];
            if(url.toString().indexOf('localhost') == -1)
                $scope.Model.showAdminView = true;

            $http({
                url: '/api/getip',
                method: "POST"
            })
            .then(function(response) {
                if(response.data.length > 0)
                {
                    $scope.Model.pcurl = response.data[0];
                    //alert(response.data[0]);
                }
                //console.log(response);
            },
            function(response) { // optional
            });    
            $scope.reset();
            $scope.getBatchRecords();
        });

        $scope.before = function(){
            if($scope.Model.status == 1)
                $scope.Model.status = 0;
            else    
                $scope.Model.status = 1;
        }
        $scope.after = function(){
            if($scope.Model.status == 1)
                $scope.Model.status = 0;
            else
                $scope.Model.status = 1;                
        }

        $scope.searchBearing = function(){
            if($scope.Model.BearingNo == undefined || $scope.Model.BearingNo.length == 0)
            {
                alert("Enter Bearing No.");
                return;
            }
            if($scope.Model.SrNo == undefined || $scope.Model.SrNo.length == 0)
            {
                alert("Enter Sr. No.");
                return;
            }


            var obj = {'BearingNo':$scope.Model.BearingNo,
                'SrNo':$scope.Model.SrNo
            }

            $http({
                url: '/api/searchbearing',
                method: "POST",
                data: obj
            })
            .then(function(response) {
                if(response.data.data.length > 0)
                {
                    $scope.Model.BeforeWt = response.data.data[0].BEFORE_WEIGHT;
                    $scope.Model.AfterWt = response.data.data[0].AFTER_WEIGHT;
                    $scope.Model.ResultWt = response.data.data[0].RESULT_WEIGHT;
                }
            },
            function(response) {

            });
        }

        var i = 10;
        $scope.enterWeight = function(){

            if($scope.Model.BearingNo == undefined || $scope.Model.BearingNo.length == 0)
            {
                alert("Enter Bearing No.");
                return;
            }
            if($scope.Model.SrNo == undefined || $scope.Model.SrNo.length == 0)
            {
                alert("Enter Sr. No.");
                return;
            }
            if($scope.Model.Username == undefined || $scope.Model.Username.length == 0)
            {
                alert("Enter Username");
                return;
            }
            if($scope.Model.UserCode == undefined || $scope.Model.UserCode.length == 0)
            {
                alert("Enter User Code");
                return;
            }
            if($scope.Model.Extra1 == undefined || $scope.Model.Extra1.length == 0)
            $scope.Model.Extra1 = "";
            if($scope.Model.Extra2 == undefined || $scope.Model.Extra2.length == 0)
            $scope.Model.Extra2 = "";
            if($scope.Model.Extra3 == undefined || $scope.Model.Extra3.length == 0)
            $scope.Model.Extra3 = "";
        
            
            $scope.Model.cWeight = i+10;
            i=i+10;

            var obj = {'BearingNo':$scope.Model.BearingNo,
                'SrNo':$scope.Model.SrNo,
                'Username':$scope.Model.Username,
                'UserCode':$scope.Model.UserCode,
                'Extra1':$scope.Model.Extra1,
                'Extra2':$scope.Model.Extra2,
                'Extra3':$scope.Model.Extra3,
                'Status':$scope.Model.status
            }

            if($scope.Model.status == 1)
            obj.BeforeWt = parseFloat($scope.Model.cWeight).toFixed(3);
            if($scope.Model.status == 0)
            obj.AfterWt = parseFloat($scope.Model.cWeight).toFixed(3);

            $http({
                url: '/api/addbatchdata',
                method: "POST",
                data: obj
            })
            .then(function(response) {
                $scope.getBatchRecords();
                $scope.Model.SrNo = "";
            },
            function(response) {

            });
        }

        $scope.getBatchRecords = function(){
            $http({
                url: '/api/getBatchRecords',
                method: "POST",
                data: {}
            })
            .then(function(response) {
                $scope.Model.batchRecords = response.data.data;
                console.log($scope.Model.batchRecords);
            },
            function(response) { // optional

            });
        }

        $scope.searchData = function(){
            if($scope.Model.fromDt == undefined || $scope.Model.fromDt.length == 0)
            {
                alert("Enter From Date");
                return;
            }
            if($scope.Model.toDt == undefined || $scope.Model.toDt.length == 0)
            {
                alert("Enter To Date");
                return;
            }

            $http({
                url: '/api/getBatchSearchRecords',
                method: "POST",
                data: {'from':$scope.Model.fromDt,'to':$scope.Model.toDt}
            })
            .then(function(response) {
                $scope.Model.batchRecords = response.data.data;
                console.log($scope.Model.batchRecords);
            },
            function(response) { // optional

            });
        }

        $scope.removeItem = function(item){
            var result = confirm("Want to delete?");
            if (result) {
                $http({
                    url: '/api/removeitem',
                    method: "POST",
                    data: {'id':item.ID}
                })
                .then(function(response) {
                    $scope.getBatchRecords();  
                },
                function(response) {
    
                });
            }
            
        }
        
        $scope.duplicate = function(item){
            var result = confirm("Want Duplicate Print ?");
            if (result) {
                $http({
                    url: '/api/duplicateprint',
                    method: "POST",
                    data: {'item':JSON.stringify(item)
                    }
                })
                .then(function(response) {
                    
                },
                function(response) {
    
                });
            }
        }

        $scope.resetData = function(){
            var result = confirm("Want to Reset All ?");
            if (result) {
                $http({
                    url: '/api/resetall',
                    method: "POST",
                    data: {}
                })
                .then(function(response) {
                    $scope.reset();
                    $scope.getBatchRecords();    
                },
                function(response) {
    
                });
            }
        }
    })
