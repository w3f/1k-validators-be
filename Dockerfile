FROM node:slim
WORKDIR /code
COPY . .
RUN ["yarn"]
RUN ["yarn", "build"]
CMD ["yarn", "js:start"]
