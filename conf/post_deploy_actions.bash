#!/bin/bash

# abort on any errors
set -e

# check that we are in the expected directory
cd `dirname $0`/..

# make the sass
sass web/css/main.scss:web/css/main.css --style=compressed
