# npm run ci
set -e

npm run whoami
whoami
echo "installing ffmpeg now"

# export npm_config_cache=./npm_cache
npm run install-ffmpeg
# integration-tests/install-ffmpeg-in-docker.sh

# npm ci
# npm run bootstrap-lerna
# npm run ci
