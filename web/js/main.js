(function($, google, mySociety){
    $(function(){

        var $map = $('#map-canvas');
        var mapOptions = {
            zoom: 6,
            // Centered on "The centre of England" as per:
            // http://en.wikipedia.org/wiki/Centre_points_of_the_United_Kingdom
            center: new google.maps.LatLng(52.561928, -1.464854)
        };
        var map = new google.maps.Map($map[0], mapOptions);

        var watlingStreet = new google.maps.Polyline({
            path: mySociety.watlingStreetCoordinates,
            geodesic: true,
            strokeColor: '#333333',
            strokeOpacity: 0.6,
            strokeWeight: 3
        });

        var infoWindow = new google.maps.InfoWindow({
            content: "",
            maxWidth: Math.round($map.innerWidth() * 0.75)
        });

        var markers = [];
        var markerClusterOptions = {
            maxZoomLevel: 7,
            gridSize: 30
        };
        var markerCluster;

        // Add Watling Street
        watlingStreet.setMap(map);

        // Add the markers
        $.each(mySociety.kepnData, function(index, place) {
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(place.lat, place.lng),
                title: place.placename
            });
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
            markerInfo += "</div>";
            google.maps.event.addListener(marker, 'click', function() {
                infoWindow.setContent(markerInfo);
                infoWindow.open(map, marker);
            });
            markers.push(marker);
        });


        markerCluster = new MarkerClusterer(map, markers, markerClusterOptions);
    });

})(window.jQuery, window.google, window.mySociety);
