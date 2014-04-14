(function(window, $, google, _, _gaq, mySociety){

_.templateSettings = {
    interpolate: /\<\@\=(.+?)\@\>/g,
    evaluate: /\<\@(.+?)\@\>/g
};


    // Filter the results from google.maps.Geocoder.geocode() into just
    // results that are actually in the UK.
    var filterGeocodeResultsToUK= function(results) {
        var filteredResults = [];
        for (var i = 0; i < results.length; i++) {
            for (var j = 0; j < results[i].address_components.length; j++) {
               if ($.inArray("country", results[i].address_components[j].types) >= 0) {
                    if (results[i].address_components[j].short_name === "GB") {
                        filteredResults.push(results[i]);
                    }
                }
            }
        }
        return filteredResults;
    };

    // Try to find the name of an address component from the results of
    // google.maps.Geocoder.geocode() within the KEPN data and return the slug
    // for the placename if there's a match, or null otherwise.
    var compareNames = function(result, placename) {
        var placenameSearch = $.trim(placename.toLowerCase());
        var slug = null;
        if (mySociety.kepnData.hasOwnProperty(placenameSearch)) {
            // There's at least one matching name, we want to return the
            // closest one, so long is it's close enough
            var places = mySociety.kepnData[placenameSearch];
            // Distances are measured in meters, so this enforces a maximum of
            // 10KM from the place, which is hopefully enough to deal with
            // varying centers of big cities, but not so far as to associate
            // totally the wrong place.
            var closestDistance = 10000;
            _.each(places, function(place) {
                var distance = google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(place.lat, place.lng),
                    result.geometry.location
                );
                if (distance <= closestDistance) {
                    closestDistance = distance;
                    slug = place.slug;
                }
            });
        }
        return slug;
    };

    // Get the slugs for places from the KEPN data for a geocode results list.
    // Takes an array of results from google.maps.Geocoder.geocode()
    // Returns an array with each result having the slug of the matching Norse
    // name, or null if there is no matching Norse name.
    //
    // Note: this matches on exact name only (case-insensitive), then compares
    // the distance between the location from the geocoder and the location
    // from KEPN to double check that they're the same place.
    var getPlaceSlugs = function(results) {
        slugs = [];
        _.each(results, function(result, i) {
            slugs[i] = null;
            _.each(result.address_components, function(component) {
                // We give sublocality preference, but check locality too
                if ($.inArray("sublocality", component.types) >= 0) {
                    var sublocalityName = compareNames(result, component.long_name);
                    if(sublocalityName !== null) {
                        slugs[i] = sublocalityName;
                        // We've found a match at sublocality level, so we can
                        // stop looking elsewhere
                        return false;
                    }
                }
                else if ($.inArray("locality", component.types) >= 0) {
                    slugs[i] = compareNames(result, component.long_name);
                }
            });
        });
        return slugs;
    };

    // Check if there are any markers in the current map view and alert the
    // user if not
    var markersInView = function() {
        var mapBounds = mySociety.map.getBounds();
        var markersInBounds = false;
        _.each(mySociety.markers, function(marker) {
            if(mapBounds.contains(marker.getPosition())) {
                markersInBounds = true;
                // Break early
                return false;
            }
        });
        return markersInBounds;
    };

    // Show a specific point result on the map
    // Takes a google.maps.LatLng
    var showPoint = function(point) {
        mySociety.map.panTo(point);
        mySociety.map.setZoom(mySociety.placeZoomLevel);
        // Check if there are any markers in view
        google.maps.event.addListenerOnce(mySociety.map, 'idle', function(){
            if(!markersInView()) {
                $(document).trigger('mySociety.popupOpen');
                mySociety.alertWindow.setPosition(point);
                mySociety.alertWindow.open(mySociety.map);
            }
        });
    };

    // Show a specific Norse place on the map
    // Takes a google.maps.Marker object
    var showNorsePlace = function(marker) {
        if(!marker.getPosition().equals(mySociety.map.getCenter()) || mySociety.map.getZoom() !== mySociety.placeZoomLevel) {
            // The map will need to pan and/or zoom, which will cause marker
            // clusterer to do some re-drawing afterwards, and hence we must
            // wait till the map is idle before we can show the marker
            mySociety.map.panTo(marker.getPosition());
            mySociety.map.setZoom(mySociety.placeZoomLevel);
            google.maps.event.addListenerOnce(mySociety.map, 'idle', function() {
                // This is an easy way to open the InfoWindow for the marker
                google.maps.event.trigger(marker, 'click');
                // This is a bit of hack, but in some cases the adjustment
                // that happens to the window when we click it doesn't happen
                // in this case because the map is already idle, and if the
                // marker will fit fully on the screen the map doesn't have to
                // move anywhere so is never "idle" again to trigger it.
                // Instead we fire it immediately.
                adjustInfoWindowPosition(mySociety.$map);
            });
        }
        else {
            // We're probably already centred on the marker, so make sure it's
            // open
            google.maps.event.trigger(marker, 'click');
            // This is another hack, The map never moves and so is never
            // "idle" to trigger it. We fire it immediately instead.
            adjustInfoWindowPosition(mySociety.$map);
        }
    };

    // Callback function for use with google.maps.Geocoder.geocode()
    // Takes the results and status objects as per normal, plus a jQuery
    // element in which to place the results and a google.maps.Map
    var geocoderCallback = function(results, status, $mapSearchResults) {
        if(status == google.maps.GeocoderStatus.OK || status == google.maps.GeocoderStatus.ZERO_RESULTS) {
            // Filter results to those that are actually in the UK, despite
            // supplying a region and bounds, it's not guaranteed otherwise
            var filteredResults = filterGeocodeResultsToUK(results);
            var slugs = getPlaceSlugs(filteredResults);
            var resultsHTML = mySociety.searchResultsTemplate({
                results: filteredResults,
                slugs: slugs
            });
            $mapSearchResults.html(resultsHTML);
            $mapSearchResults.find('a').click(function(e) {
                e.preventDefault();
                var $this = $(this);
                if($this.hasClass('norse')) {
                    // This result has a norse placename, so show that
                    var slug = $this.data('slug');
                    var marker = mySociety.markersBySlug[slug];
                    showNorsePlace(marker);
                }
                else {
                    var location = $this.data('location');
                    var parts = location.split(',');
                    var lat = parseFloat(parts[0]);
                    var lng = parseFloat(parts[1]);
                    var point = new google.maps.LatLng(lat, lng);
                    showPoint(point);
                }
                $mapSearchResults.hide();
            });
            $mapSearchResults.show();
        }
        else {
            // Over our quota, or some other issue
            // TODO - report the issue to the user better than this
            alert("Google Maps could not respond to your request, please try again later.");
        }
    };

    // Click handler for social sharing buttons on map marker popups
    var mapSocialClick = function($link, shareUrl) {
        var openUrl = $link.attr("href");
        var shareName = $link.attr("data-social");
        var w = 0;
        var h = 0;

        if(typeof(_gaq) !== 'undefined') {
            _gaq.push(['_trackEvent', 'SocialButtons', shareName, shareUrl]);
        }

        if (shareName == "facebook") {
            w = 750;
            h = 612;
        }
        if (shareName == "twitter") {
            w = 558;
            h = 260;
        }
        if (shareName == "googleplus") {
            w = 564;
            h = 351;
        }
        window.open(openUrl, shareName, "location=1,status=1,scrollbars=1,  width=" + w + ",height=" + h);
    };

    // Success callback for geolocation using the browser's geolocation api
    // Takes a Position object from the browser, a jQuery object for the
    // button and the text to set the button to
    var geolocationSuccess = function(position, $geolocationButton, originalText) {
        var point = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        showPoint(point);
        $geolocationButton.text(originalText);
        $geolocationButton.attr("disabled", false);
        $geolocationButton.removeClass("loading");
    };

    // Failure for geolocation using the browser's geolocation api
    // Takes a jQuery object for the button
    var geolocationFailure = function($geolocationButton, $mapSearch) {
        // There's no point showing the button any more if it didn't work.
        $geolocationButton.hide();
        $mapSearch.removeClass('map-search--with-geolocation');
        alert("Sorry, we couldn't find your position automatically, perhaps try searching instead?");
    };

    // Is the current browser a touch-screen device?
    // From: http://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
    var isTouchDevice = function() {
        return 'ontouchstart' in window || !!(navigator.msMaxTouchPoints);
    };

    // Check if the currently shown info window is far enough from the top
    // of the map to not be hidden under the search box
    var adjustInfoWindowPosition = function() {
        var marginNeeded = 100;
        var mapOffset = Math.round(mySociety.$map.offset().top);
        var infoWindowOffset = Math.round($('.map-marker').parent().parent().offset().top);
        var difference = infoWindowOffset - mapOffset;
        if (difference < marginNeeded) {
            // We want to move the map down to show more window
            var movementNeeded = (marginNeeded - difference) * -1;
            mySociety.map.panBy(0, movementNeeded);
        }
    };

    $(function() {
        // Cache some selectors
        var $map = $('#map-canvas');
        var $mapSearch = $("#mapSearch");
        var $mapSearchForm = $('#mapSearchForm');
        var $mapSearchInput = $('#mapSearchInput');
        var $mapSearchResults = $('#mapSearchResults');
        var $geolocationButton = $('#geolocationButton');

        // Compile clientside templates
        var markerInfoTemplate = _.template($('script#markerInfo').html());
        var markerTitleTemplate = _.template($('script#markerTitle').html());
        var searchResultsTemplate = _.template($('script#searchResults').html());

        var mapStyles = [ { "featureType": "road.highway", "elementType": "labels", "stylers": [ { "visibility": "off" } ] },{ "featureType": "poi", "elementType": "labels", "stylers": [ { "visibility": "off" } ] },{ "featureType": "administrative.locality" },{ "featureType": "road", "elementType": "geometry.stroke", "stylers": [ { "visibility": "off" } ] },{ "featureType": "road", "elementType": "geometry", "stylers": [ { "gamma": 1.71 } ] } ];

        var mapOptions = {
            zoom: 6,
            maxZoom: 12,
            minZoom: 5,
            // A tweaked centre to work best in our chosen viewport
            center: new google.maps.LatLng(53.45, -3.35),
            mapTypeId: google.maps.MapTypeId.TERRAIN,
            mapTypeControl: false,
            streetViewControl: false,
            panControl: false,
            styles: mapStyles
        };

        // Create the map
        var map = new google.maps.Map($map[0], mapOptions);

        // Create an infowindow to show details in
        var infoWindow = new google.maps.InfoWindow({
            content: "",
            maxWidth: 544
        });
        // And one to show titles in
        var titleWindow = new google.maps.InfoWindow({
            content: "",
            maxWidth: Math.round($map.innerWidth() * 0.65)
        });
        // And one to show alerts in
        var alertWindow = new google.maps.InfoWindow({
            content: '<div class="map-marker"><h3>Sorry, there aren\'t any Norse places near here.</h3><p>Perhaps try zooming out a bit or searching for a different place.</p></div>',
            maxWidth: 544
        });

        var markers = [];
        var markersBySlug = {};

        // Geocoding options
        var geocoder = new google.maps.Geocoder();

        // Define north-east and south-west points of UK to use as bounds for
        // Google's geocoder
        var ne = new google.maps.LatLng(60.00, 3.00);
        var sw = new google.maps.LatLng(49.00, -13.00);
        var geocodingBounds = new google.maps.LatLngBounds(sw, ne);

        // Should we show nearest cinemas?
        // TODO - calculate this based on the date?
        var showNearestCinema = true;

        // Export things to the global object
        mySociety.map = map;
        mySociety.geocoder = geocoder;
        mySociety.markers = markers;
        mySociety.markersBySlug = markersBySlug;
        mySociety.markerInfoTemplate = markerInfoTemplate;
        mySociety.searchResultsTemplate = searchResultsTemplate;
        // What zoom level to go to when showing a specific place
        mySociety.placeZoomLevel = 9;
        mySociety.infoWindow = infoWindow;
        mySociety.alertWindow = alertWindow;
        mySociety.titleWindow = titleWindow;

        // Add Watling Street to the map
        mySociety.watlingStreet.setMap(map);
        mySociety.watlingStreetShadow.setMap(map);

        mySociety.$map = $map;

        // Add the markers to the map
        _.each(mySociety.kepnData, function(placelist, name) {
            _.each(placelist, function(place) {
                var shareUrl = window.location.href.split('#')[0] + "%23" + place.slug;
                var shareText = place.placename;
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(place.lat, place.lng),
                    title: place.placename,
                    icon: '/img/small_blue_marker.png',
                    map: map
                });
                var markerInfo = markerInfoTemplate({
                    place: place,
                    shareUrl: shareUrl,
                    shareText: shareText,
                    showNearestCinema: showNearestCinema
                });
                var markerTitle = markerTitleTemplate({
                    place: place
                });
                // Show a big popup when it's clicked
                google.maps.event.addListener(marker, 'click', function() {
                    // Close any other popups
                    // We fire a custom event so that we can close other
                    // windows loaded from other modules
                    $(document).trigger('mySociety.popupOpen');
                    // Remove mouseover handlers for now so we don't get two
                    // popups showing
                    if(!isTouchDevice()) {
                        google.maps.event.clearListeners(marker, 'mouseover');
                    }

                    // Show the main popup
                    infoWindow.setContent(markerInfo);
                    infoWindow.open(map, marker);
                    window.location.hash = place.slug;

                    // Remove google's styling classes from the popup
                    $(".gm-style").removeClass("gm-style");

                    // Register a click handler for the social buttons in the
                    // marker window
                    $("ul.map-marker__social-buttons li > a").click(function(e) {
                        e.preventDefault();
                        mapSocialClick($(this), shareUrl);
                    });

                    // When this window is closed, re-register the hover popup
                    // handler
                    if(!isTouchDevice()) {
                        google.maps.event.addListenerOnce(infoWindow, 'closeclick', function() {
                            google.maps.event.addListener(marker, 'mouseover', function() {
                                titleWindow.setContent(markerTitle);
                                titleWindow.open(map, marker);
                            });
                        });
                    }

                    // When the info window is in place, make sure it's not
                    // under the search box.
                    google.maps.event.addListenerOnce(map, 'idle', function(){
                        adjustInfoWindowPosition();
                    });

                });
                // Show a small popup when it's hovered on non-touch devices
                if(!isTouchDevice()) {
                    google.maps.event.addListener(marker, 'mouseover', function() {
                        titleWindow.setContent(markerTitle);
                        titleWindow.open(map, marker);
                    });
                    google.maps.event.addListener(marker, 'mouseout', function() {
                        titleWindow.close();
                    });
                }
                markers.push(marker);
                markersBySlug[place.slug] = marker;
            });

            // Listen to our custom events to close other popups when one
            // opens
            $(document).on('mySociety.popupOpen', function(event) {
                infoWindow.close();
                titleWindow.close();
                alertWindow.close();
            });
        });

        // See if we should be showing a specific location and show that if so
        google.maps.event.addListenerOnce(map, 'idle', function(){
            if(window.location.hash !== "") {
                var marker = markersBySlug[window.location.hash.substr(1)];
                if(!_.isUndefined(marker)) {
                    showNorsePlace(marker);
                }
            }
        });

        // Handle the geocoding of location searches
        $mapSearchResults.hide();
        $mapSearchForm.submit(function(e) {
            e.preventDefault();
            $mapSearchResults.hide();
            var query = $mapSearchInput.val();
            var geocodingOptions = {
                address: query,
                region: 'uk',
                bounds: geocodingBounds
            };
            geocoder.geocode(geocodingOptions, function(results, status) {
                geocoderCallback(results, status, $mapSearchResults);
            });
        });

        // Handle browser geolocation
        if ("geolocation" in window.navigator) {
            var originalText = $geolocationButton.text();
            var loadingText = "Locating...";
            $geolocationButton.click(function(e) {
                e.preventDefault();
                $geolocationButton.attr("disabled", true);
                $geolocationButton.text(loadingText);
                $geolocationButton.addClass('loading');
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        geolocationSuccess(position, $geolocationButton, originalText);
                    },
                    function() {
                        geolocationFailure($geolocationButton, $mapSearch);
                    }
                );
            });
            $geolocationButton.show();
            $mapSearch.addClass('map-search--with-geolocation');
        }

        // Show the search box when the map is loaded
        google.maps.event.addListenerOnce(map, 'idle', function(){
            $mapSearch.show();
        });

        // Hide watling street at high zoom levels
        google.maps.event.addListener(mySociety.map, 'zoom_changed', function(){
            if (mySociety.map.getZoom() >= 11) {
                mySociety.watlingStreet.setMap(null);
                mySociety.watlingStreetShadow.setMap(null);
            } else {
                mySociety.watlingStreet.setMap(mySociety.map);
                mySociety.watlingStreetShadow.setMap(mySociety.map);
            }
        });

    });

})(window, window.jQuery, window.google, window._, window._gaq, window.mySociety);
