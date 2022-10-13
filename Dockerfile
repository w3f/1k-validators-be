FROM node:18-slim AS builder
ARG MATRIX_TOKEN
ARG PACKAGE
ENV PACKAGE ${PACKAGE}
WORKDIR /code
COPY . .
RUN echo "building ${PACKAGE}... "; \
    yarn set version 3.2.2 ; \
    yarn install ; \
    echo "yarn install done. Building...." ; \
    yarn workspaces foreach run build ; \
    echo "building ${PACKAGE} done."
CMD yarn run start:js:${PACKAGE}

