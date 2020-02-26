FROM node:latest
WORKDIR /code
COPY . .
CMD ["yarn", "start"]
EXPOSE 3300 8000 9946