# Use LTS Node.js slim image
FROM node:14.17-slim

# Video support dependency
RUN apt-get update && apt-get install -y ffmpeg

# Install NPM dependencies and copy the project
WORKDIR /teddit
COPY . ./
RUN npm install --no-optional
COPY config.js.template ./config.js

RUN find ./static/ -type d -exec chmod -R 777 {} \;

CMD npm start
