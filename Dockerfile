# Use LTS nodejs base image
FROM node:14.15.1-alpine

# video support dependency
RUN apk add ffmpeg

# install npm dependencies and copy project
WORKDIR /teddit
COPY package.json /teddit/
COPY package-lock.json /teddit/
RUN npm install --no-optional
COPY config.js.template /teddit/config.js
COPY . /teddit/

CMD npm start
