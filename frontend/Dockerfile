# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --network-timeout 600000

COPY . .

EXPOSE 3000

CMD ["yarn", "start"]
