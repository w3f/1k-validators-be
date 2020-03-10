FROM node:slim
WORKDIR /code
COPY . .
RUN ["yarn"]
CMD ["yarn", "start"]
