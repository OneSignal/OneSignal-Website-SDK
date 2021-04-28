FROM node:12.18.0
WORKDIR /sdk
COPY package.json .
RUN yarn
