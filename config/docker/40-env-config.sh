#!/bin/sh
# Runs from the nginx image's /docker-entrypoint.d before nginx starts. Writes the runtime
# environment config the SPA reads (window.__ENV__) from container environment variables.
set -eu

: "${API_URL:?API_URL must be set (e.g. https://api.nawishta.co.uk)}"
: "${MAIN_SITE:?MAIN_SITE must be set (e.g. https://www.nawishta.co.uk)}"
export NODE_ENV="${NODE_ENV:-production}"
# Links to the other Nawishta apps (the header's app switcher); optional, production by default.
export LIBRARIES_URL="${LIBRARIES_URL:-https://libraries.nawishta.co.uk}"
export LIBRARY_EDITOR_URL="${LIBRARY_EDITOR_URL:-https://editor.nawishta.co.uk}"
export DICTIONARY_URL="${DICTIONARY_URL:-https://dictionary.nawishta.co.uk}"

envsubst '${NODE_ENV} ${API_URL} ${MAIN_SITE} ${LIBRARIES_URL} ${LIBRARY_EDITOR_URL} ${DICTIONARY_URL}' \
    < /etc/nginx/env-config.js.template \
    > /usr/share/nginx/html/env-config.js

echo "env-config: NODE_ENV=${NODE_ENV} API_URL=${API_URL} MAIN_SITE=${MAIN_SITE} LIBRARIES_URL=${LIBRARIES_URL} LIBRARY_EDITOR_URL=${LIBRARY_EDITOR_URL} DICTIONARY_URL=${DICTIONARY_URL}"
