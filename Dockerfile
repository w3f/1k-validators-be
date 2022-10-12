FROM node:18-slim AS builder
ARG MATRIX_TOKEN
ARG PACKAGE
ENV PACKAGE ${PACKAGE}
COPY . /app
WORKDIR /app
RUN echo "building ${PACKAGE}... " && \
    yarn set version 3.2.2 && \
    yarn install && \
    yarn build
CMD ["node", "packages/${PACKAGE}/build/index.js",  "start"]
