# Use LTS Node.js base image
FROM node:14.15.1-alpine

# Video support dependency
RUN apk add ffmpeg

# Install NPM dependencies and copy the project
WORKDIR /teddit
COPY . /teddit/
RUN npm install --no-optional
COPY config.js.template /teddit/config.js

CMD npm start
