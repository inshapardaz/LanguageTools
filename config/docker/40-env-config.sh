#!/bin/sh
# Runs from the nginx image's /docker-entrypoint.d before nginx starts. Writes the runtime
# environment config the SPA reads (window.__ENV__) from container environment variables.
set -eu

: "${API_URL:?API_URL must be set (e.g. https://api.nawishta.co.uk)}"
: "${MAIN_SITE:?MAIN_SITE must be set (e.g. https://www.nawishta.co.uk)}"
export NODE_ENV="${NODE_ENV:-production}"

envsubst '${NODE_ENV} ${API_URL} ${MAIN_SITE}' \
    < /etc/nginx/env-config.js.template \
    > /usr/share/nginx/html/env-config.js

echo "env-config: NODE_ENV=${NODE_ENV} API_URL=${API_URL} MAIN_SITE=${MAIN_SITE}"
