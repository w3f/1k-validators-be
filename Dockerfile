FROM node:22-slim AS docs_builder
WORKDIR /code

COPY docs docs
RUN cd docs && npm install && npm run build

FROM node:22-slim
WORKDIR /code
ARG MATRIX_TOKEN
ARG PACKAGE
ENV PACKAGE ${PACKAGE}

COPY --from=docs_builder /code/docs/build/ /code/docs/build/

COPY . .

RUN --mount=type=cache,target=/code/.yarn/cache \
    --mount=type=cache,target=/turbo_cache \
    yarn install --immutable && \
    yarn turbo --cache-dir /turbo_cache && \
    yarn workspaces focus --production

CMD yarn run start:js:${PACKAGE}
