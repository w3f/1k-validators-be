FROM node:14-slim
ARG MATRIX_TOKEN
WORKDIR /code
COPY . .
RUN ["yarn", "--force"]
RUN ["yarn", "build"]
CMD ["yarn", "js:start"]