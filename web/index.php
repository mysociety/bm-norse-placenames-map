<?php
    // mySociety config
    require_once "../conf/general";
    // Header, from British Museum's templates
    require_once "header.php";
?>

    <!--
    Map container.

    The size of this is such that we show almost all of England at zoom level
    7 in Google Maps (sorry southern Cornwall, you're not very Norse anyway).
    -->
    <div id="map-canvas" style="width: 100%; height: 650px"></div>

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
    <script type="text/javascript"
        src="http://google-maps-utility-library-v3.googlecode.com/svn/tags/markerclusterer/1.0.2/src/markerclusterer_compiled.js">
    </script>

    <script type="text/javascript">
        window.mySociety = window.mySociety || {};
    </script>
    <script type="text/javascript" src="/js/watlingstreet.js"></script>
    <script type="text/javascript" src="/js/kepn.js"></script>
    <script type="text/javascript" src="/js/main.js"></script>
</body>
</html>
