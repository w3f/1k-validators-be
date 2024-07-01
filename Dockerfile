FROM node:21-slim AS builder
WORKDIR /code
ARG PACKAGE
ENV PACKAGE ${PACKAGE}
COPY . .
RUN --mount=type=cache,target=/code/.yarn/cache \
    --mount=type=cache,target=/turbo_cache \
    yarn install --immutable && \
    yarn turbo --cache-dir /turbo_cache && \
    yarn workspaces focus --production

FROM node:21-slim AS docs_builder
WORKDIR /code
COPY docs docs
RUN cd docs && npm install && npm run build

FROM node:21-slim
ARG PACKAGE
ENV PACKAGE ${PACKAGE}
WORKDIR /code
COPY --from=builder /code/package.json .
COPY --from=builder /code/yarn.lock .
COPY --from=builder /code/node_modules ./node_modules
COPY --from=builder /code/packages ./packages
COPY --from=docs_builder /code/docs/build ./docs
CMD yarn run start:js:${PACKAGE}
