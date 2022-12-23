// angular.module('starter', ['starter.controllers','ngRoute','ngMaterial','barcodeGenerator','ui.bootstrap','ngCkeditor','base64'])
angular.module('starter', ['starter.controllers','ngRoute','ngMaterial','ui.bootstrap'])

    .config(function($routeProvider) {
        $routeProvider

            .when('/dashboard', {
                url:'/dashboard',
                templateUrl: 'templates/dashboard.html',
                controller:'mainctrl'
            })
            $routeProvider.otherwise({redirectTo:'/dashboard'});
    });