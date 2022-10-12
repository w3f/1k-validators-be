FROM node:18-slim AS builder
COPY . /app
WORKDIR /app
RUN yarn set version 3.2.2 && \
    yarn workspaces list --json  && \
    yarn install && \
    yarn workspace @1kv/common build && \
    yarn workspace @1kv/core build
CMD ["node", "packages/core/build/index.js", "start"]
