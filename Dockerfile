FROM node:18-slim AS builder
RUN apt-get update && apt-get install -y curl libssl-dev && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /code
COPY .yarn/ .yarn/
COPY .yarnrc.yml package.json yarn.lock /code/
COPY packages/common/package.json /code/packages/common/
COPY packages/core/package.json /code/packages/core/
COPY packages/gateway/package.json /code/packages/gateway/
COPY packages/scorekeeper-status-ui/package.json /code/packages/scorekeeper-status-ui/
COPY packages/telemetry/package.json /code/packages/telemetry/
COPY packages/worker/package.json /code/packages/worker/
RUN yarn install --immutable
COPY . /code/
ARG PACKAGE
RUN yarn build:prod

FROM node:18-slim
WORKDIR /code
COPY --from=builder /code/packages ./packages
ENV NODE_ENV=production
COPY --from=builder /code/node_modules ./node_modules
CMD yarn run start:js:${PACKAGE}
