# Use LTS Node.js base image
FROM node:14.16-alpine

# Video support dependency
RUN apk add ffmpeg

# Install NPM dependencies and copy the project
WORKDIR /teddit
COPY . ./
RUN npm install --no-optional
COPY config.js.template ./config.js

RUN find ./static/ -type d -exec chmod -R 777 {} \;

CMD npm start
