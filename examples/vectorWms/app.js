'use strict';

define(['angular', 'ol', 'toolbar', 'layermanager', 'WfsSource', 'core', 'map', 'query', 'search', 'print', 'permalink', 'lodexplorer', 'measure', 'geolocation'],

    function(angular, ol, toolbar, layermanager, WfsSource) {
        var module = angular.module('hs', [
            'hs.core',
            'hs.toolbar',
            'hs.layermanager',
            'hs.map',
            'hs.query',
            'hs.search', 'hs.print', 'hs.permalink', 'hs.lodexplorer',
            'hs.geolocation'
        ]);

        module.directive('hs', ['OlMap', '$window', function(OlMap, $window) {
            return {
                templateUrl: hsl_path + 'hslayers.html',
                link: function(scope, element) {
                    var w = angular.element($window);
                    w.bind('resize', function() {
                        element[0].style.height = w.height() + "px";
                        element[0].style.width = w.width() + "px";
                        $("#map").height(w.height());
                        $("#map").width(w.width());
                        OlMap.map.updateSize()
                    });
                    w.resize();
                }
            };
        }]);
        
        module.value('box_layers', []);
       
            var style = new ol.style.Style({
                    image: new ol.style.Circle({
                        fill: new ol.style.Fill({
                            color: [242, 121, 0, 0.7]
                        }),
                        stroke: new ol.style.Stroke({
                            color: [0xbb, 0x33, 0x33, 0.7]
                        }),
                        radius: 5
                    }),
                    fill: new ol.style.Fill({
                        color: "rgba(139, 189, 214, 0.3)",
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#112211',
                        width: 1
                    })
                })
        
        module.value('default_layers', [            
            new ol.layer.Tile({
                source: new ol.source.OSM(),
                title: "Base layer",
                box_id: 'osm',
                base: true
            }),
            new ol.layer.Vector({
                title: "NUTS polys",
                source: new WfsSource({url:'http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/nuts_2010_p_wfs.map', typename:'nuts2', projection:'EPSG:3857'}),
                style: style
            }),
            new ol.layer.Vector({
                title: "NUTS points",
                source: new WfsSource({url:'http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/nuts_2010_p_wfs.map', typename:'nuts', projection:'EPSG:3857'}),
                style: style
            })
        ]);

        module.value('default_view', new ol.View({
            center: ol.proj.transform([17.474129, 52.574000], 'EPSG:4326', 'EPSG:3857'), //Latitude longitude    to Spherical Mercator
            zoom: 4,
            units: "m"
        }));

        module.controller('Main', ['$scope', 'Core', 'InfoPanelService',
            function($scope, Core, InfoPanelService) {
                if (console) console.log("Main called");
                $scope.hsl_path = hsl_path; //Get this from hslayers.js file
                $scope.Core = Core;

                $scope.$on('infopanel.updated', function(event) {
                });
            }
        ]);

        return module;
    });