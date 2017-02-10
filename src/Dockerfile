FROM node:boron

ARG TIP_PORT
ENV PORT $TIP_PORT
ENV SSL_KEY "tip.key"
ENV SSL_CERT "tip.crt"
ENV USE_HTTP 0

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install
RUN npm install apidoc -g

# Bundle app source
COPY . /usr/src/app

# Create documentation
RUN apidoc -i routes/

EXPOSE $PORT
CMD [ "npm", "start" ]