FROM node:9.7.1
WORKDIR /sdk
COPY package.json .
RUN yarn

CMD ./docker/docker-entry-point.sh