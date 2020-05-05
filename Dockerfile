FROM node:slim
ARG MATRIX_TOKEN
WORKDIR /code
COPY . .
RUN ["yarn"]
RUN ["yarn", "build"]
CMD ["yarn", "js:start"]