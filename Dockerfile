FROM node:18.18.0
WORKDIR /sdk
COPY package.json .
RUN yarn
