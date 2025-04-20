FROM node:22 AS build-env

COPY . /app
WORKDIR /app

RUN npm install -g corepack
RUN corepack install
RUN alias pnpm="corepack pnpm"
RUN pnpm install

RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12
COPY --from=build-env /app/dist /app

WORKDIR /data
WORKDIR /app

ENV DATA_PATH="/data"
ENV DATA_PATH="data"
ENV SERVER_PORT=8080
ENV CAMERA_NAMES=""

CMD ["main.js"]
