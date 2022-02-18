#!/usr/bin/env bash
set -euo pipefail

sed -i "s/jessie main/jessie main contrib non-free/" /etc/apt/sources.list
echo "deb [check-valid-until=no] http://archive.debian.org/debian jessie-backports main contrib non-free" >> /etc/apt/sources.list
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 8B48AD6246925553 7638D0442B90D010
apt-get update && apt-get install -y ffmpeg
