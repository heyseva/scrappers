FROM ghcr.io/puppeteer/puppeteer:22.6.5

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

ENV DEV_DB=mongodb://mongo:27017

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD [ "node", "dist/index.js" ]
