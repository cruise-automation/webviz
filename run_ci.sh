# npm run ci
set -e

# export npm_config_cache=./npm_cache

integration-tests/install-ffmpeg-in-docker.sh

# npm ci
# npm run bootstrap-lerna
npm run ci
