FROM node:18-slim AS builder
ARG MATRIX_TOKEN
ARG BUILD_CONTEXT
COPY . /app
WORKDIR /app
RUN echo "building ${BUILD_CONTEXT}... " && \
    yarn set version 3.2.2 && \
    yarn install && \
    yarn build
CMD ["node", "packages/${BUILD_CONTEXT}/build/index.js", "start"]
