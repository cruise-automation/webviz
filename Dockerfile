# Copyright (c) 2018-present, GM Cruise LLC
#
# This source code is licensed under the Apache License, Version 2.0,
# found in the LICENSE file in the root directory of this source tree.
# You may not use this file except in compliance with the License.

# This container is published at https://hub.docker.com/r/cruise/webviz-ci.

FROM node:10.15.3-slim

# Install some general dependencies for stuff below and for CircleCI;
# https://circleci.com/docs/2.0/custom-images/#required-tools-for-primary-containers
RUN apt-get update && apt-get install -yq libgconf-2-4 wget git ssh --no-install-recommends

# Install Google Chrome for Puppeteer.
# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-in-docker
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst ttf-freefont --no-install-recommends
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

ENV WEBVIZ_IN_DOCKER=true
