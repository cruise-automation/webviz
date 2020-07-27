#!/usr/bin/env bash
set -euo pipefail

sed -i "s/jessie main/jessie main contrib non-free/" /etc/apt/sources.list
echo "deb [check-valid-until=no] http://archive.debian.org/debian jessie-backports main contrib non-free" >> /etc/apt/sources.list
apt-get update && apt-get install -y ffmpeg
