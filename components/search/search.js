/**
 * @namespace hs.search
 * @memberOf hs
 */
define(['angular', 'ol', 'map', 'permalink', 'styles'],

    function(angular, ol) {
        angular.module('hs.search', ['hs.map', 'hs.styles'])
            /**
            * @memberof hs.search
            * @ngdoc directive
            * @name hs.search.directiveSearchinput
            * @description Add search input template to page, with automatic change event and clear button
            */
            .directive('hs.search.directiveSearchinput', ['$window', function($window) {
                return {
                    templateUrl: hsl_path + 'components/search/partials/searchinput.html?bust=' + gitsha,
                    replace: true,
                    link: function(scope, element) {

                    }
                };
                /**
                * @memberof hs.search
                * @ngdoc directive
                * @name hs.search.directiveSearchresults
                * @description Add search results template to page
                */
            }]).directive('hs.search.directiveSearchresults', ['$window', function($window) {
                return {
                    templateUrl: hsl_path + 'components/search/partials/searchresults.html?bust=' + gitsha,
                    replace: true,
                    link: function(scope, element) {

                    }
                };
                /**
                * @memberof hs.search
                * @ngdoc service
                * @name hs.search.service
                * @description Provides geolocation search request from site selected in config (geonames/sdi4apps) and pass response to handler on success
                */
            }]).service('hs.search.service', ['$http', 'hs.utils.service', 'config',
                function($http, utils, config) {
                    this.xhr = null;
                    this.request = function(query) {
                        var url = null;
                        if (angular.isUndefined(config.search_provider) || config.search_provider == 'geonames') {
                            url = "http://api.geonames.org/searchJSON?&username=raitis&name_startsWith=" + query;
                        } else if (config.search_provider == 'sdi4apps_openapi') {
                            url = "http://portal.sdi4apps.eu/openapi/search?q=" + query;
                        }

                        url = utils.proxify(url);
                        if (me.xhr !== null) me.xhr.abort();
                        me.xhr = $.ajax({
                            url: url,
                            cache: false,
                            success: function(r) {
                                me.searchResultsReceived(r);
                                me.xhr = null
                            }
                        });
                    };
                    var me = this;
                }
            ])
        /**
         * @memberof hs.search
         * @ngdoc controller
         * @name hs.search.controller
         */
        .controller('hs.search.controller', ['$scope', 'Core', 'hs.map.service', 'hs.search.service', '$log', 'hs.permalink.service_url', 'hs.styles.service', 'config',
            function($scope, Core, OlMap, SearchService, $log, permalink, styles, config) {
                var map = OlMap.map;
                var point_clicked = new ol.geom.Point([0, 0]);
                var format = new ol.format.WKT();

                $scope.search_results_layer = null;

                /**
                 * Initialization of search state
                 * @memberof hs.search.controller
                 * @function init 
                 */
                $scope.init = function() {
                    $scope.query = "";
                    $scope.results = [];
                    $scope.clearvisible = false;
                    if (permalink.getParamValue('search')) {
                        $scope.query = permalink.getParamValue('search');
                        Core.searchVisible(true);
                        $scope.queryChanged();
                    }
                }

                /**
                 * Handler of search input, request search service and display results div
                 * @memberof hs.search.controller
                 * @function queryChanged 
                 */
                $scope.queryChanged = function() {
                    SearchService.request($scope.query);
                    $("#searchresults").show();
                }

                /**
                 * Zoom map to selected result from results list
                 * @memberof hs.search.controller
                 * @function zoomTo 
                 * @param {object} result Selected result 
                 */
                $scope.zoomTo = function(result) {
                    $scope.fcode_zoom_map = {
                        'PPLA': 12,
                        'PPL': 15,
                        'PPLC': 10,
                        "ADM1": 9,
                        'FRM': 15,
                        'PPLF': 13,
                        'LCTY': 13,
                        'RSTN': 15,
                        "PPLA3": 9,
                        'AIRP': 13,
                        'AIRF': 13,
                        'HTL': 17,
                        'STM': 14,
                        'LK': 13
                    };
                    $scope.createCurrentPointLayer();
                    if (angular.isUndefined(config.search_provider) || config.search_provider == 'geonames') {
                        coordinate = ol.proj.transform([parseFloat(result.lng), parseFloat(result.lat)], 'EPSG:4326', map.getView().getProjection());
                    } else if (config.search_provider == 'sdi4apps_openapi') {
                        var g_feature = format.readFeature(result.FullGeom.toUpperCase());
                        coordinate = (g_feature.getGeometry().transform('EPSG:4326', map.getView().getProjection())).getCoordinates();
                    }
                    point_clicked.setCoordinates(coordinate, 'XY');
                    map.getView().setCenter(coordinate);
                    if (angular.isDefined(result.fcode) && angular.isDefined($scope.fcode_zoom_map[result.fcode])) {
                        map.getView().setZoom($scope.fcode_zoom_map[result.fcode]);
                    } else {
                        map.getView().setZoom(10);
                    }
                    $scope.results = [];
                }

                 /**
                 * Remove previous search and search results
                 * @memberof hs.search.controller
                 * @function clear 
                 */
                $scope.clear = function() {
                    $scope.results = [];
                    $scope.query = '';
                    $scope.clearvisible = false;
                    if ($scope.search_results_layer) map.getLayers().remove($scope.search_results_layer);
                    $scope.search_results_layer = null;
                }
                
                /**
                 * Handler for receiving results of search request, sends results to correct parser
                 * @memberof hs.search.controller
                 * @function searchResultsReceived
                 * @param {object} response Result of search request
                 */
                SearchService.searchResultsReceived = function(response) {
                    $("#searchresults").show();
                    $scope.clearvisible = true;
                    $scope.createCurrentPointLayer();
                    if (angular.isUndefined(config.search_provider) || config.search_provider == 'geonames') {
                        parseGeonamesResults(response);
                    } else if (config.search_provider == 'sdi4apps_openapi') {
                        parseOpenApiResults(response);
                    }
                    if (!$scope.$$phase) $scope.$digest();
                }

                /**
                 * Result parser of results from Geonames service
                 * @memberof hs.search.controller
                 * @function parseGeonamesResults
                 * @param {object} response Result of search request
                 */
                function parseGeonamesResults(response) {
                    $scope.results = response.geonames;
                    angular.forEach($scope.results, function(result) {
                        var src = $scope.search_results_layer.getSource();
                        var feature = new ol.Feature({
                            geometry: new ol.geom.Point(ol.proj.transform([parseFloat(result.lng), parseFloat(result.lat)], 'EPSG:4326', map.getView().getProjection())),
                            record: result
                        });
                        src.addFeature(feature);
                        result.feature = feature;
                    });
                }

                /**
                 * Result parser of results from OpenApi service
                 * @memberof hs.search.controller
                 * @function parseOpenApiResults
                 * @param {object} response Result of search request
                 */
                function parseOpenApiResults(response) {
                    $scope.results = response.data;
                    angular.forEach($scope.results, function(result) {
                        var g_feature = format.readFeature(result.FullGeom.toUpperCase());
                        var src = $scope.search_results_layer.getSource();
                        var feature = new ol.Feature({
                            geometry: g_feature.getGeometry().transform('EPSG:4326', map.getView().getProjection()),
                            record: result
                        });
                        src.addFeature(feature);
                        result.feature = feature;
                    });
                }

                /**
                 * Add search results layer to map and clean old results if exist
                 * @memberof hs.search.controller
                 * @function createCurrentPointLayer
                 */
                $scope.createCurrentPointLayer = function() {
                    if ($scope.search_results_layer) {
                        $scope.search_results_layer.getSource().clear();
                        map.removeLayer($scope.search_results_layer);
                    }
                    $scope.search_results_layer = new ol.layer.Vector({
                        title: "Search results",
                        source: new ol.source.Vector({}),
                        style: styles.pin_white_blue_highlight,
                        show_in_manager: false
                    });
                    map.addLayer($scope.search_results_layer);
                }

                /**
                 * Set property highlighted of result to state
                 * @memberof hs.search.controller
                 * @function highlightResult
                 * @param {object} result
                 * @param {string} state
                 */
                $scope.highlightResult = function(result, state) {
                    if (angular.isDefined(result.feature))
                        result.feature.set('highlighted', state)
                }
                $scope.init();

                $scope.$on('search.results_received', function(e, r) {
                    $scope.searchResultsReceived(r);
                });
                $scope.$watch('Core.panelVisible("search")', function(newValue, oldValue) {
                    if (newValue !== oldValue && newValue) {
                        setTimeout(function() {
                            $('#search_address').focus();
                        }, 500);
                    }
                });
                $scope.$emit('scope_loaded', "Search");
            }
        ]);
    })
