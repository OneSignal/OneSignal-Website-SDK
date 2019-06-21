FROM node:10.16.0
WORKDIR /sdk
COPY package.json .
RUN yarn

CMD ./docker/docker-entry-point.sh
