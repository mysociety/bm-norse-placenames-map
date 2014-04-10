<?php
    // mySociety config
    require_once "../conf/general";

    // Header, from British Museum's templates
    if (array_key_exists('mobile', $_GET)) {
        require_once "mobile-header.php";
    } else {
        require_once "header.php";
    }
?>

    <!-- Our styles -->
    <link type="text/css" rel="stylesheet" href="/css/main.css" />
    <!-- IE Styles - Note: these apply to all IE's because of the special meta
         tag that's included in the <head> that forces them to behave like IE7,
         if that's removed, it's probably likely that this could only be
         included for IE8 and below, since all it does is repeat the css that's
         otherwise inside a media query.
    -->
    <!--[if IE]>
        <link type="text/css" rel="stylesheet" href="/css/ie.css" />
    <![endif]-->

<?php
    // British Museum page, from:
    // www.britishmuseum.org/whats_on/exhibitions/vikings.aspx
    if (array_key_exists('mobile', $_GET)) {
        require_once "mobile-document-header.php";
    } else {
        require_once "document-header.php";
    }
?>

    <p class="pullOut">Discover Norse placenames near you</p>
    <div class="map-search" id="mapSearch" style="display:none">
        <form id="mapSearchForm" action="" method="GET">
            <label for="mapSearchInput" class="map-search__label">Search for Norse names near you: </label>
            <div class="map-search__form clearfix">
                <input type="text" name="placeQuery" class="map-search__form__input" id="mapSearchInput" placeholder="e.g. Scunthorpe" />
                <div class="map-search__form__buttons">
                    <button type="submit" class="map-search__form__buttons__submit">Search</button>
                    <button href="#" id="geolocationButton" class="map-search__form__buttons__geolocation" style="display:none;" title="Find my location automatically">Find my location automatically</button>
                </div>
            </div>
        </form>
        <div class="map-search__results" id="mapSearchResults"></div>
    </div>
    <div class="map-canvas-wrapper">
        <div id="map-canvas"></div>
    </div>

<?php
    // Footer, from British Museum's templates
    if (array_key_exists('mobile', $_GET)) {
        require_once "mobile-footer.php";
    } else {
        require_once "footer.php";
    }
?>

    <!-- Our scripts -->
    <!--
    jQuery manually loaded here, the real site loads this version
    of jQuery asynchronously via /javascripts/v2/setup.js so I've put this in
    to get the same environment.
    -->
    <script type="text/javascript"
        src="http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js">
    </script>

    <script type="text/javascript"
        src="https://maps.googleapis.com/maps/api/js?libraries=geometry&key=<?=GOOGLE_MAPS_API_KEY?>&sensor=false">
    </script>
    <script type="text/javascript" src="/js/vendor/underscore.js"></script>

    <!-- Client side templates -->
    <script type="text/html" id="markerInfo">
        <div class="map-marker">
            <h2 class="map-marker__header"><@= place.placename @></h2>
            <p class="map-marker__etymology"><@= place.etymology @></p>
            <h3 class="map-marker__elements-header">Elements and their meanings</h3>
            <ul class="map-marker__elements">
            <@ _.each(place.elements, function(element) { @>
                <li class="map-marker__elements__item">
                <@ if (element.headword !== null) { @>
                    <span class="map-marker__elements__item__headword"><@= element.headword @></span>
                <@ } else { @>
                    <span class="map-marker__elements__item__hword"><@= element.hword @></span>
                <@ } @>
                (<@= element.language @>) <@= element.note @>
                </li>
            <@ }); @>
            </ul>
            <@ if(showNearestCinema) { @>
                <div class="map-marker__cinema-name tight">
                    <h3>
                        Vikings Live showing at a cinema near <@= place.placename @>
                    </h3>
                    <p>Book now for Vikings Live on <@= place.cinema.live @> at
                        <@ if(place.cinema.cinemaurl !== "") { @>
                            <a href="<@= place.cinema.cinemaurl @>"><@= place.cinema.cinema @></a>.
                        <@ } else if (place.cinema.cinemaemail !== "") { @>
                            <a href="mailto:<@= place.cinema.cinemaemail @>"><@= place.cinema.cinema @></a>
                        <@ } else { @>
                            <@= place.cinema.cinema @>
                            <@ if (place.cinema.phone !== "") { @>
                                (<a href="tel:<@= place.cinema.phone @>"><@= place.cinema.phone @></a>)
                            <@ } @>
                        <@ } @>
                    </p>
                    <p><a class="highlight" href="">See all cinemas showing Vikings Live<i class="link-arrow"></i></a></p>
                </div>
            <@ } @>
            <h4>Talk about this place</h4>
            <ul class="map-marker__social-buttons">
                <li>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=<@=shareUrl@>"
                       title="Share on Facebook" data-social="facebook">
                        <img src="http://www.britishmuseum.org/images/v2/defaults/facebook.png" />
                    </a>
                </li>
                <li>
                    <a href="http://twitter.com/share?url=<@=shareUrl@>&text=<@=shareText@>"
                       title="Share on Twitter" data-social="twitter">
                        <img src="http://www.britishmuseum.org/images/v2/defaults/twitter.png" />
                    </a>
                </li>
                <li>
                    <a href="https://plusone.google.com/_/+1/confirm?hl=en&url=<@=shareUrl@>"
                       title="Share on Google+" data-social="googleplus">
                        <img src="http://www.britishmuseum.org/images/v2/defaults/googleplus.png" />
                    </a>
                </li>
            </ul>
        </div>
    </script>

    <script type="text/html" id="markerTitle">
        <div class="map-marker">
            <h2 class="map-marker__header"><@= place.placename @></h2>
        </div>
    </script>

    <script type="text/html" id="watlingStreetMarkerInfo">
        <div class="map-marker">
            <h2 class="map-marker__header">Watling Street</h2>
            <p class="map-marker__etymology">An ancient trackway that formed the boundary between Anglo-Saxon Britain and the Danelaw.</p>
        </div>
    </script>

    <script type="text/html" id="searchResults">
        <ul>
            <@ if (results.length > 0) { @>
                <@ _.each(results, function(result, index) { @>
                    <li>
                        <@ if(slugs[index] !== null) { @>
                            <a href="#<@=slugs[index]@>" class="norse" data-slug="<@=slugs[index]@>">
                        <@ } else { @>
                            <a href="#" data-location="<@=result.geometry.location.toUrlValue()@>">
                        <@ } @>
                        <@= result.formatted_address @>
                        </a>
                    </li>
                <@ }); @>
            <@ } else { @>
                <li>
                    <span>Sorry, no results were found for that search.</span>
                </li>
            <@ } @>
        </ul>
    </script>

    <script type="text/html" id="cinemaMarkerInfo">
        <div class="map-marker">
            <h2 class="map-marker__header"><@= cinema.cinema @></h2>
            <p>This cinema is showing <a href="http://www.britishmuseum.org/whats_on/exhibitions/vikings/vikings_live.aspx">Vikings Live</a> on: <@= cinema.live @></p>
            <p class="map-marker__cinema-link">
                <@ if(cinema.cinemaurl !== "") { @>
                    <a href="<@= cinema.cinemaurl @>">See showings at this cinema</a>
                <@ } @>
            </p>
            <p class="map-marker__cinema-link">
            <@ if(cinema.cinemaemail !== "") { @>
                <a href="mailto:<@= cinema.cinemaemail @>">Email this cinema</a>
            <@ } @>
            </p>
            <p class="map-marker__cinema-link">
                <@ if(cinema.phone !== "") { @>
                    <a href="tel:<@= cinema.phone @>">Phone this cinema on: <@= cinema.phone @></a>
                <@ } @>
            </p>
        </div>
    </script>

    <script type="text/javascript">
        window.mySociety = window.mySociety || {};
    </script>
    <script type="text/javascript" src="/js/watlingstreet.js"></script>
    <script type="text/javascript" src="/js/kepn.js"></script>
    <script type="text/javascript" src="/js/main.js"></script>
</body>
</html>
