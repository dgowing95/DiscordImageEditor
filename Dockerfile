FROM node:14
WORKDIR /app
COPY . .

EXPOSE 80

RUN npm install

CMD [ "node", "index.js"]

