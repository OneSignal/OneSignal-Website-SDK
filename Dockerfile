FROM node:22.13.1
WORKDIR /sdk
COPY package.json .
RUN npm ci
