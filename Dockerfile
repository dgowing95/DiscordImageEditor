FROM node:14
WORKDIR /app
COPY ./package* ./
RUN npm install
COPY fonts ./fonts


COPY controllers ./controllers
COPY index.js .
CMD [ "node", "--trace-warnings", "index.js"]


