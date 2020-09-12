FROM node:14
WORKDIR /app
EXPOSE 80
COPY ./package.json .
COPY ./package-lock.json .
RUN npm install
COPY controllers ./controllers
COPY index.js .
CMD [ "node", "--trace-warnings", "index.js"]


