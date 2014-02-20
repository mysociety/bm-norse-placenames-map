(function($, google, mySociety){

    // Build the HTML for a markerInfo object showing a particular placename's
    // data from the KEPN project.
    // TODO - Replace with a client side template
    var buildMarkerInfo = function(place) {
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
                    if (results[i].address_components[j].short_name == "GB") {
                        filteredResults.push(results[i]);
                    }
                }
            }
        }
        return filteredResults;
    };

    // Build the HTML for results from the geocoder
    // Takes an array of results from google.maps.Geocoder.geocode()
    // TODO - Replace with a client side template
    var buildGeocoderResultsHTML = function(results) {
        var resultsHTML = '<ul>';
        $.each(results, function(index, result) {
            resultsHTML += '<li>';
            resultsHTML += '<a href="#" data-location="' + result.geometry.location.toUrlValue() + '">';
            resultsHTML += result.formatted_address;
            resultsHTML += '</a></li>';
        });
        resultsHTML += '</ul>';
        return resultsHTML;
    };

    // Callback function for use with google.maps.Geocoder.geocode()
    // Takes the results and status objects as per normal, plus a jQuery
    // element in which to place the results and a google.maps.Map
    var geocoderCallback = function(results, status, $mapSearchResults, map) {
        if(status == google.maps.GeocoderStatus.OK) {
            // Filter results to those that are actually in the UK, despite
            // supplying a region and bounds, it's not guaranteed otherwise
            var filteredResults = filterGeocodeResultsToUK(results);
            var resultsHTML = buildGeocoderResults(filteredResults);
            $mapSearchResults.html(resultsHTML);
            $mapSearchResults.find('a').click(function(e) {
                e.preventDefault();
                var location = $(this).data('location');
                var parts = location.split(',');
                var lat = parseFloat(parts[0]);
                var lng = parseFloat(parts[1]);
                var point = new google.maps.LatLng(lat, lng);
                map.panTo(point);
                map.setZoom(10);
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
                geocoderCallback(results, status, $mapSearchResults, map);
            });
        });

        // Add Watling Street to the map
        watlingStreet.setMap(map);

        // Add the markers to the map
        $.each(mySociety.kepnData, function(index, place) {
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(place.lat, place.lng),
                title: place.placename
            });
            var markerInfo = buildMarkerInfo(place);
            google.maps.event.addListener(marker, 'click', function() {
                infoWindow.setContent(markerInfo);
                infoWindow.open(map, marker);
            });
            markers.push(marker);
        });

        // Create a marker cluster to manage the markers
        markerCluster = new MarkerClusterer(map, markers, markerClusterOptions);

    });

})(window.jQuery, window.google, window.mySociety);
