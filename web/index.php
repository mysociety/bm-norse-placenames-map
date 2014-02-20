<?php
    // mySociety config
    require_once "../conf/general";
    // Header, from British Museum's templates
    require_once "header.php";
?>

    <!-- Our styles -->
    <link type="text/css" rel="stylesheet" href="/css/main.css" />

<?php
    // British Museum page, from:
    // www.britishmuseum.org/whats_on/exhibitions/vikings.aspx
    require_once "document-header.php";
?>

    <p class="pullOut">Discover Norse placenames near you</p>
    <div class="map-search">
        <form id="mapSearchForm" action="" method="GET">
            <label for="mapPlaceSearch" class="map-search__label">Search for Norse names near you: </label>
            <div class="map-search__input__wrapper">
                <input type="text" name="placeQuery" class="map-search__input" id="mapPlaceSearch" placeholder="Enter a location, e.g. Scunthorpe, or SW11AA..." />
                <button type="submit" class="map-search__button">Search</button>
            </div>
        </form>
        <div class="map-search__results"></div>
    </div>
    <div id="map-canvas"></div>

<?php
    // Footer, from British Museum's templates
    require_once "footer.php";
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
        src="https://maps.googleapis.com/maps/api/js?key=<?=GOOGLE_MAPS_API_KEY?>&sensor=false">
    </script>
    <script type="text/javascript" src="/js/vendor/markerclusterer.js"></script>

    <script type="text/javascript">
        window.mySociety = window.mySociety || {};
    </script>
    <script type="text/javascript" src="/js/watlingstreet.js"></script>
    <script type="text/javascript" src="/js/kepn.js"></script>
    <script type="text/javascript" src="/js/main.js"></script>
</body>
</html>
