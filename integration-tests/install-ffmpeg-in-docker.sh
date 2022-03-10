#!/usr/bin/env bash
set -euo pipefail

# Install ffmpeg. Validity check disabled because the repository is no longer updated.
# [check-valid-until=no]: https://unix.stackexchange.com/a/508728
# [trusted=yes]: https://unix.stackexchange.com/a/602746
sed -i "s/jessie main/jessie main contrib non-free/" /etc/apt/sources.list
echo "deb [check-valid-until=no, trusted=yes] http://archive.debian.org/debian jessie-backports main contrib non-free" >> /etc/apt/sources.list
# Adding the keys to fix the error:
# ```
# #8 2.073 W: GPG error: http://archive.debian.org/debian jessie-backports InRelease:
# The following signatures couldn't be verified because the public key is not available:
# NO_PUBKEY 8B48AD6246925553 NO_PUBKEY 7638D0442B90D010
# ```
# See also: https://askubuntu.com/a/15272
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 8B48AD6246925553 7638D0442B90D010
apt-get update && apt-get install -y ffmpeg
