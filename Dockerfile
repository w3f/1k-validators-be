FROM node:21-slim AS builder
ARG MATRIX_TOKEN
ARG PACKAGE
ENV PACKAGE ${PACKAGE}
WORKDIR /code

COPY docs docs
RUN cd docs && npm install && npm run build

COPY . .

RUN --mount=type=cache,target=/code/.yarn/cache \
    --mount=type=cache,target=/turbo_cache \
    yarn install --immutable && \
    yarn turbo --cache-dir /turbo_cache

CMD yarn run start:js:${PACKAGE}
