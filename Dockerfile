FROM node:18-slim AS builder
ARG MATRIX_TOKEN
ARG PACKAGE
ENV PACKAGE ${PACKAGE}
COPY . /app
WORKDIR /app
RUN echo "building ${PACKAGE}... " && \
    yarn set version 3.2.2 && \
    yarn install && \
    yarn workspace @1kv/common build && \
    yarn workspace @1kv/core build
CMD yarn start:js:${PACKAGE}
