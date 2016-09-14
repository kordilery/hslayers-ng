/**
 * @namespace hs.draw
 * @memberOf hs
 */
define(['angular', 'ol', 'map', 'core', 'utils'],

    function(angular, ol) {
        angular.module('hs.draw', ['hs.map', 'hs.core', 'hs.utils'])
            .directive('hs.draw.directive', function() {
                return {
                    templateUrl: hsl_path + 'components/draw/partials/draw.html?bust=' + gitsha
                };
            })

        .directive('hs.draw.toolbarButtonDirective', function() {
            return {
                templateUrl: hsl_path + 'components/draw/partials/toolbar_button_directive.html?bust=' + gitsha
            };
        })

        .controller('hs.draw.controller', ['$scope', 'hs.map.service', 'Core', 'hs.geolocation.service', '$http', 'hs.utils.service',
            function($scope, OlMap, Core, Geolocation, $http, utils) {
                var map = OlMap.map;
                $scope.features = [];
                $scope.current_feature = null;
                $scope.type = 'Point';

                $scope.categories = {
                    '999': 'Uncategorized'
                }

                var attrs_with_template_tags = ['category', 'description', 'name'];
                var attrs_not_editable = ['geometry', 'highlighted'];

                var source = new ol.source.Vector({});
                var style = function(feature, resolution) {
                    return [new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 255, 255, 0.4)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: feature.get('highlighted') ? '#d00504' : '#ffcc33',
                            width: 2
                        }),
                        image: new ol.style.Circle({
                            radius: 5,
                            fill: new ol.style.Fill({
                                color: feature.get('highlighted') ? '#d11514' : '#ffcc33'
                            }),
                            stroke: new ol.style.Stroke({
                                color: feature.get('highlighted') ? '#d00504' : '#ff8e32',
                                width: 2
                            })
                        })
                    })]
                };

                var vector = new ol.layer.Vector({
                    source: source,
                    style: style
                });


                var draw; // global so we can remove it later
                function addInteraction() {
                    draw = new ol.interaction.Draw({
                        source: source,
                        type: /** @type {ol.geom.GeometryType} */ ($scope.type)
                    });
                    map.addInteraction(draw);

                    draw.on('drawstart',
                        function(evt) {
                            // set sketch

                            $scope.sketch = [evt.feature];
                            $scope.features.push({
                                type: $scope.type,
                                ol_feature: evt.feature
                            });
                            if ($scope.is_unsaved) return;
                            if (!$scope.$$phase) $scope.$digest();
                            $scope.setCurrentFeature($scope.features[$scope.features.length - 1], $scope.features.length - 1);
                        }, this);

                    draw.on('drawend',
                        function(evt) {
                            if (!$scope.$$phase) $scope.$digest();
                        }, this);
                }

                $scope.setType = function(what) {
                    $scope.type = what;
                }

                $scope.stop = function() {
                    try {
                        if (draw.getActive()) draw.finishDrawing();
                    } catch (ex) {}
                    draw.setActive(false);
                }

                $scope.start = function() {
                    try {
                        if (draw.getActive()) draw.finishDrawing();
                    } catch (ex) {}
                    draw.setActive(true)
                }

                $scope.newPointFromGps = function() {
                    pos = Geolocation.last_location; //TODO timestamp is stored in Geolocation.last_location.geolocation.timestamp, it might be a good idea to accept only recent enough positions ---> or wait for the next fix <---.
                    var g_feature = new ol.geom.Point(pos.latlng);
                    var feature = new ol.Feature({
                        geometry: g_feature
                    });
                    source.addFeature(feature);
                    $scope.features.push({
                        type: $scope.type,
                        ol_feature: feature
                    });
                    if ($scope.is_unsaved) return;
                    if (!$scope.$$phase) $scope.$digest();
                    $scope.setCurrentFeature($scope.features[$scope.features.length - 1], $scope.features.length - 1);
                }

                $scope.highlightFeature = function(feature, state) {
                    feature.ol_feature.set('highlighted', state);
                }

                /**
                 * @function setCurrentFeature
                 * @memberOf hs.draw.controller
                 * @description Opens list of feature attributes 
                 * @param {object} feature - Wrapped feature to edit or view
                 * @param {number} index - Used to position the detail panel after layers li element
                 */
                $scope.setCurrentFeature = function(feature, index) {
                    if ($scope.is_unsaved) return;
                    if ($scope.current_feature == feature) {
                        $scope.current_feature = null;
                    } else {
                        $scope.current_feature = feature;
                        $(".hs-dr-editpanel").insertAfter($("#hs-dr-feature-" + index));
                        $(".hs-dr-editpanel").get(0).scrollIntoView();
                        var cf = $scope.current_feature;
                        var olf = cf.ol_feature;
                        //Fill feature container object, because we cant edit attributes in OL feature directly
                        cf.extra_attributes = [];
                        angular.forEach(olf.getKeys(), function(key) {
                            if (attrs_not_editable.indexOf(key) == -1) {
                                cf[key] = olf.get(key);
                            }
                            if (attrs_not_editable.indexOf(key) == -1 && attrs_with_template_tags.indexOf(key) == -1) {
                                cf.extra_attributes.push({
                                    name: key,
                                    value: olf.get(key)
                                });
                            }
                        });
                    }
                    return false;
                }

                $scope.saveFeature = function() {
                    var cf = $scope.current_feature;
                    var olf = cf.ol_feature;
                    olf.set('name', cf.name);
                    olf.set('description', cf.description);
                    olf.set('category', cf.category);
                    angular.forEach(cf.extra_attributes, function(attr) {
                        olf.set(attr.name, attr.value);
                    });
                    $scope.is_unsaved = false;
                }

                $scope.setUnsaved = function() {
                    $scope.is_unsaved = true;
                }

                $scope.cancelChanges = function() {
                    $scope.is_unsaved = false;
                    $scope.current_feature = null;
                }

                $scope.setType = function(type) {
                    $scope.type = type;
                    if (!$scope.$$phase) $scope.$digest();
                }

                $scope.clearAll = function() {
                    $scope.features = [];
                    source.clear();
                    $scope.sketch = null;
                    if (!$scope.$$phase) $scope.$digest();
                }

                $scope.addUserDefinedAttr = function() {
                    $scope.current_feature.extra_attributes.push({
                        name: "New attribute",
                        value: "New value"
                    })
                }

                $scope.removeFeature = function(feature) {
                    $scope.features.splice($scope.features.indexOf(feature), 1);
                    source.removeFeature(feature.ol_feature);
                }

                $scope.setFeatureStyle = function(new_style) {
                    style = new_style;
                    vector.setStyle(new_style);
                }

                $scope.$watch('type', function() {
                    if (Core.mainpanel != 'draw') return;
                    map.removeInteraction(draw);
                    addInteraction();
                });

                $scope.activateDrawing = function() {
                    map.addLayer(vector);
                    addInteraction();
                }

                $scope.deactivateDrawing = function() {
                    map.removeInteraction(draw);
                    map.removeLayer(vector);
                }

                $scope.$on('core.mainpanel_changed', function(event) {
                    if (Core.mainpanel == 'draw') {
                        $scope.activateDrawing();
                    } else {
                        $scope.deactivateDrawing();
                    }
                });

                $scope.sync = function() {
                    angular.forEach($scope.features, function(feature) {
                        var d = new Date();
                        var now = d.toISOString();

                        var olf = feature.ol_feature;
                        var attributes = {};
                        angular.forEach(olf.getKeys(), function(key) {
                            if (attrs_not_editable.indexOf(key) == -1 && key != 'category' && key != 'description') {
                                attributes[key] = olf.get(key);
                            }
                        });
                        var cord = ol.proj.transform(olf.getGeometry().getCoordinates(), OlMap.map.getView().getProjection(), 'EPSG:4326');

                        var fd = new FormData();
                        fd.append('timestamp', '2016-09-06 12:00:00+0200');
                        fd.append('category', olf.get('category')),
                            fd.append('description', olf.get('description'));
                        fd.append('lon', cord[0]);
                        fd.append('lat', cord[1]);
                        fd.append('user_id', 'tester');
                        fd.append('dataset', '999');
                        fd.append('unitId', '1111');
                        fd.append('attributes', JSON.stringify(attributes));

                        $http.post('http://portal.sdi4apps.eu/SensLog-VGI/rest/vgi/insobs', fd, {
                            transformRequest: angular.identity,
                            headers: {
                                'Content-Type': undefined
                            }
                        });
                    })
                }

                $scope.$emit('scope_loaded', "draw");
            }
        ]);
    })