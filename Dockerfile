FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json ./

RUN npm install --quiet --omit=dev

ADD lib lib/
ADD widevine widevine/

COPY index.mjs ./

CMD [ "node", "index.mjs" ]