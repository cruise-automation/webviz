# npm run ci
set -e

export npm_config_cache=./npm_cache

# npm ci
# npm run bootstrap-lerna
npm run ci
