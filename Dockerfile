FROM node:14
WORKDIR /app
EXPOSE 80
COPY . .
RUN npm install
CMD [ "node", "index.js"]


