FROM node:20-alpine AS build

RUN apk add --no-cache python3 make build-base

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg
ADD widevine widevine/
COPY --from=build app/node_modules node_modules/
ADD lib lib/

COPY index.mjs ./

CMD [ "node", "index.mjs" ]