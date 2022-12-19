FROM node:14.21.1
WORKDIR /sdk
COPY package.json .
RUN yarn
