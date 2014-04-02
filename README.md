British Museum - Norse names
============================

A static page of HTML and JS to allow you to browse data about place names in
the UK with Norse origins. Uses data from the [KEPN project](http://kepn.nottingham.ac.uk).

See `web/index.php` for the meat of the code, along with `web/js/main.js`
Don't be put off by the PHP file, it's just to make it simpler to break things
up into sections and for us to be able to deploy it on our servers with
minimal hassle.

How things work
---------------
The main focus of the page is a V3 Google Map, this is created and loaded in
main.js. A line is defined and draw onto this map in watlingstreet.js and data
for the many markers it shows comes from kepn.js. This is data from the [KEPN project](http://kepn.nottingham.ac.uk)
but tweaked a little to change the format so that they're in an object keyed
by the placename (lowercase). This allows us to lookup places by name when the
user does a search.

The markers are put on the map and are then stored in an object keyed by a
slug we've generated for each place. This allows us to find a marker by slug
for when a particular marker is shared. Markers are shared via a slug in the
url hash.

The search feature uses Google Map's geocoder to look up places, it filters
them to be in the UK and then compares the name to the names of Norse places
we have, in order to know what it can do when you select one. If there's a
matching norse name (same name, within 10km of the geocoder result) it'll open
the popup for that marker, otherwise it just zooms to the geocoder result.

The browser location feature tries to get a lat/lon from your browser and then
reverse geocodes it using Google Map's geocoder.

Cinemas
-------
In addition to the main dataset, cinemas which are showing the Viking's live
show are included in a separate file: `web/js/cinemas.js` and drawn on the map
as markers too. These are also cross-referenced into the KEPN dataset so that
place markers can show their nearest cinema (calculated in a batch and then
added to this data). To turn this off, remove `cinemas.js` and set
`mySociety.showNearestCinema` to `false` in `main.js`.
