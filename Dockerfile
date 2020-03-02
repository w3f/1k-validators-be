FROM node:latest
WORKDIR /code
COPY . .
RUN ["yarn"]
CMD ["yarn", "start"]