FROM node:boron

ARG TIP_PORT=443
ENV PORT $TIP_PORT
ENV SSL_KEY "tip.uoc.tesla-project.eu.key.pem"
ENV SSL_CERT "tip.uoc.tesla-project.eu.crt"
ENV SSL_CA_CERT "ca.cert.pem"
ENV SSL_PATH "/ssl"
ENV USE_HTTP 0
ENV LOGS_FOLDER "/logs"
ENV TOKEN_ISSUER "tip-test"
ENV AUTH_REQUESTS 0
ENV TEP_ADDRESS "https://tep"
ENV TEP_ENFORCE_KEY_SHARING 0
ENV SEND_PUBLIC_KEY 0
ENV NUM_THREADS 1
ENV MAX_MEM_THREAD 512
ENV LOG_ROTATE_MAX_BYTES 5242880 # 5Mb
ENV LOG_ROTATE_BACKUP_COUNT 5
ENV KEY_POOL_ENABLED 1
ENV KEY_POOL_SIZE 100

# Create logs folder
RUN mkdir -p $LOGS_FOLDER

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install
RUN npm install apidoc -g

# Bundle app source
COPY . /usr/src/app

# Create default SSL certs
RUN mkdir -p /ssl
COPY ./ssl/. /ssl

# Create documentation
RUN apidoc -i routes/

EXPOSE $PORT
CMD [ "npm", "start" ]