FROM node:22
WORKDIR /sdk
COPY package.json .
RUN yarn
