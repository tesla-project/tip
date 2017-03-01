# TeSLA Identity Provider (TIP)

---

## Synopsis
The Identity Provider is a module that must be deployed at the institution side. It will manage the anonimization of the data captured by TeSLA and to provide the tokens used to athenticate the External Tools with the TEP.

## Standards

TIP uses the following standards:

    * RFC4122: All TeSLA IDs generated by TIP follow the [RFC4122](https://tools.ietf.org/html/rfc4122) version 4 standard.
    * RFC7519: All tokens generated by TIP follow the [RFC7519](https://tools.ietf.org/html/rfc7519) standard.

---

## Configuration

The environment variables used by TIP are:

### General

    * PORT: Port where TIP will listen.
    * LOGS_FOLDER: Folder used to store all the logs of the application.
    * NUM_THREADS: Number of instances to execute (-1 run one per CPU).
    * MAX_MEM_THREAD: Maximum memory allowed for each thread. Once achieved, thread will be restarted.
    * LOG_ROTATE_MAX_BYTES: Maximum size in bytes of log files before rotate. (default 5242880)
    * LOG_ROTATE_BACKUP_COUNT: Number of log files to store as backup. Older files will be removed.
    
### Database

    * DB_HOST: Database host
    * DB_PORT: Database port 
	* DB_USER: Username used to authenticate with the database
	* DB_PASSWORD: Password for provided username
	* DB_NAME: Database name
	* DB_SCHEMA: Database schema (only used when database is PostreSQL
	
### Security
	
	* USE_HTTP: If "1", TIP will listen for http requests. Otherwhise, HTTPS requests are expected. Disabling HTTPS may cause problems with authentication.
    * SSL_PATH: Path where required certificates and keys are stored.
    * SSL_KEY: Filename of the TIP private key. This file must exist in SSL_PATH.
    * SSL_CERT: Filename of the TIP certificate. This file must exist in SSL_PATH.
    * SSL_CA_CERT: Filename of the CA trusted chain used to validate the certificates. This file must exist in SSL_PATH.
    * AUTH_REQUESTS: Enable or disable authentication of incoming requests. If "1", the clients must provide a valid certificate for a Plugin in the institution of the TIP (see access restrictions). If "0", no authentication is performed.
    
### Tokens
    
    * TOKEN_ISSUER: Name to use as issuer of the issued tokens
    * TEP_ADDRESS: Full address with protocol and port for the TEP. Is used to send the public keys for token signature validation.
    * TEP_ENFORCE_KEY_SHARING: If enabled, an error is returned if the public key cannot be shared with TEP. Otherwise, only an error is shown on logs.
    * SEND_PUBLIC_KEY: Enable or disable the public key sharing with TEP. If "1", everytime a new key pair for a user is generated for token signature, the publica key will be delivered to TEP. Otherwise, there is no communication with TEP.
	

## Installation

.env file has all the environment variables used by the TIP, and docker-compose configuration file shows how to setup an instance of the TIP and required database.

Docker compose assigns the .env variables to different containers.

---

## API Reference

The description of all end-points, parameters and errors is automatically deployed with TIP. Access to the TIP root path using a browser to see the documentation.

---

## Access Restrictions

TIP is an internal module of the institution, and only will allow requests from plugins. If AUTH_REQUESTS is activated, it will check that:

    * Client certificates are valid with respect to the provided SSL_CA_CERT
    * Client certificate CN (Common Name) corresponds to a plugin.
    * Client certificate O (Organization) is the same than the TIP certificate one.

---

## Tests

TIP is tested as part of the continuous integration in TeSLA. Additional tests will be included as part of the source code.

---

## TODO

Following are the remaining tasks for TIP:

- [ ] Basic tests in the TIP repository to be run on master branch
- [ ] Authentication tests as part of the TeSLA integration.
- [ ] Implement token signature based on elliptical codes.
- [ ] Add license to TIP software.

---

## License
Universitat Oberta de Catalunya © 2017