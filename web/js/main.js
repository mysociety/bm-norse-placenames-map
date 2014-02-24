(function($, google, mySociety){

    // Build the HTML for a markerInfo object showing a particular placename's
    // data from the KEPN project.
    // TODO - Replace with a client side template
    var buildMarkerInfoHTML = function(place) {
        var markerInfo = '<div>';
        markerInfo += '<h2 style="color: black;">' + place.placename + '</h2>';
        markerInfo += '<p style="color: black;">' + place.etymology + '</p>';
        markerInfo += '<h3 style="color: black;">Elements and their meanings:</h3>';
        markerInfo += '<ul>';
        $.each(place.elements, function(index, element) {
            markerInfo += "<li>";
            if (element.headword !== null) {
                markerInfo += "<strong>" + element.headword + "</strong>";
            } else {
                markerInfo += "<strong>" + element.hword + "</strong>";
            }
            markerInfo += " (" + element.language + ") " + element.note;
            markerInfo += "</li>";
        });
        markerInfo += '</ul>';
        markerInfo += '</div>';
        return markerInfo;
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
        var placenameSearch = placename.toLowerCase().trim();
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
            $.each(places, function(index, place) {
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
        $.each(results, function(i, result) {
            slugs[i] = null;
            $.each(result.address_components, function(j, component) {
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
                // TODO - should we look beyond locality and sublocality? I
                // think this covers everything we're interested in...
            });
        });
        return slugs;
    };

    // Build the HTML for results from the geocoder.
    // Takes an array of results from google.maps.Geocoder.geocode() and
    // returns HTML to represent them as a list of links.
    // TODO - Replace with a client side template
    var buildGeocoderResultsHTML = function(results) {
        var slugs = getPlaceSlugs(results);
        var resultsHTML = '<ul>';
        // TODO - show something when there's no results too!
        $.each(results, function(index, result) {
            resultsHTML += '<li>';
            if(slugs[index] !== null) {
                resultsHTML += '<a href="#" class="norse" data-slug="';
                resultsHTML += slugs[index] + '">';
            }
            else {
                resultsHTML += '<a href="#" data-location="';
                resultsHTML += result.geometry.location.toUrlValue() + '">';
            }
            resultsHTML += result.formatted_address;
            resultsHTML += '</a></li>';
        });
        resultsHTML += '</ul>';
        return resultsHTML;
    };

    // Show a geocoder result on the map
    // Takes a lat/lng string from google.maps.LatLng.toUrlValue() and a
    // google.maps.Map object
    var showGeocodeResult = function(location, map) {
        var parts = location.split(',');
        var lat = parseFloat(parts[0]);
        var lng = parseFloat(parts[1]);
        var point = new google.maps.LatLng(lat, lng);
        map.panTo(point);
        map.setZoom(10);
    };

    // Show a specific Norse place on the map
    // Takes a google.maps.Marker object and a google.maps.Map object
    var showNorsePlace = function(marker, map) {
        if(!marker.getPosition().equals(map.getCenter()) || map.getZoom() !== 10) {
            // The map will need to pan and/or zoom, which will cause marker
            // clusterer to do some re-drawing afterwards, and hence we must
            // wait till the map is idle before we can show the marker
            map.panTo(marker.getPosition());
            map.setZoom(10);
            google.maps.event.addListenerOnce(map, 'idle', function() {
                // This is an easy way to open the InfoWindow for the marker
                google.maps.event.trigger(marker, 'click');
            });
        }
        else {
            // We're probably already centred on the marker, so make sure it's
            // open
            google.maps.event.trigger(marker, 'click');
        }
    };

    // Callback function for use with google.maps.Geocoder.geocode()
    // Takes the results and status objects as per normal, plus a jQuery
    // element in which to place the results and a google.maps.Map
    var geocoderCallback = function(results, status, $mapSearchResults, map, markersBySlug) {
        if(status == google.maps.GeocoderStatus.OK) {
            // Filter results to those that are actually in the UK, despite
            // supplying a region and bounds, it's not guaranteed otherwise
            var filteredResults = filterGeocodeResultsToUK(results);
            var resultsHTML = buildGeocoderResultsHTML(filteredResults);
            $mapSearchResults.html(resultsHTML);
            $mapSearchResults.find('a').click(function(e) {
                e.preventDefault();
                var $this = $(this);
                if($this.hasClass('norse')) {
                    // This result has a norse placename, so show that
                    var slug = $this.data('slug');
                    var marker = markersBySlug[slug];
                    showNorsePlace(marker, map);
                }
                else {
                    var location = $this.data('location');
                    showGeocodeResult(location, map);
                }
                $mapSearchResults.hide();
            });
            $mapSearchResults.show();
        }
        else if (status == google.maps.GeocoderStatus.ZERO_RESULTS) {
            // No results found
            // TODO - report the issue to the user better than this
            alert("No matching addresses found.");
        }
        else {
            // Over our quota, or some other issue
            // TODO - report the issue to the user better than this
            alert("Google Maps could not respond to your request, please try again later.");
        }
    };

    $(function(){
        // Cache some selectors
        var $map = $('#map-canvas');
        var $mapSearchForm = $('#mapSearchForm');
        var $mapSearchInput = $('#mapSearchInput');
        var $mapSearchResults = $('#mapSearchResults');

        // Map options
        var mapOptions = {
            zoom: 6,
            // Centered on "The centre of England" as per:
            // http://en.wikipedia.org/wiki/Centre_points_of_the_United_Kingdom
            center: new google.maps.LatLng(52.561928, -1.464854)
        };

        // Create the map
        var map = new google.maps.Map($map[0], mapOptions);

        // Create watling street
        var watlingStreet = new google.maps.Polyline({
            path: mySociety.watlingStreetCoordinates,
            geodesic: true,
            strokeColor: '#333333',
            strokeOpacity: 0.6,
            strokeWeight: 3
        });

        // Create an infowindow to show details in
        var infoWindow = new google.maps.InfoWindow({
            content: "",
            maxWidth: Math.round($map.innerWidth() * 0.75)
        });

        var markers = [];
        var markersBySlug = {};
        var markerClusterOptions = {
            minimumClusterSize: 4
        };
        var markerCluster;

        // Geocoding options
        var geocoder = new google.maps.Geocoder();

        // Define north-east and south-west points of UK to use as bounds for
        // Google's geocoder
        var ne = new google.maps.LatLng(60.00, 3.00);
        var sw = new google.maps.LatLng(49.00, -13.00);
        var geocodingBounds = new google.maps.LatLngBounds(sw, ne);

        // Add Watling Street to the map
        watlingStreet.setMap(map);

        // Add the markers to the map
        $.each(mySociety.kepnData, function(name, placelist) {
            $.each(placelist, function(index, place) {
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(place.lat, place.lng),
                    title: place.placename,
                    icon: '/img/helmet.png'
                });
                var markerInfo = buildMarkerInfoHTML(place);
                google.maps.event.addListener(marker, 'click', function() {
                    infoWindow.setContent(markerInfo);
                    infoWindow.open(map, marker);
                });
                markers.push(marker);
                markersBySlug[place.slug] = marker;
            });
        });

        // Create a marker cluster to manage the markers
        markerCluster = new MarkerClusterer(map, markers, markerClusterOptions);

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
                geocoderCallback(results, status, $mapSearchResults, map, markersBySlug);
            });
        });

    });

})(window.jQuery, window.google, window.mySociety);
