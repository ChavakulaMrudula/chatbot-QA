# Docker Documentation 
## Dockerfile Documentation 
### steps followed to create Dockerfile
1. Create a file named Dockerfile (no file extension). 
2. Start with a base image using FROM. 
3. Set a working directory using WORKDIR. 
4. Install system dependencies if needed using RUN. 
5. Copy dependency files using COPY package*.json ./. 
6. Install project dependencies using RUN npm install (or equivalent). 
7. Copy source code using COPY . .. 
8. Expose application port using EXPOSE. 
9. Set the start command using CMD.
#### Frontend DockerFile
``` bash
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```
#### Backend DockerFile 
``` bash
FROM node:18
WORKDIR /app
# Install PostgreSQL client tools for version 15
RUN apt-get update && \
    apt-get install -y lsb-release wget && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && \
    apt-get install -y postgresql-client-15
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5001
CMD ["node", "index.js"]
```
##### Dependencies neeeded to be installed
* Updates package lists (apt-get update).
* Installs lsb-release (for OS info) and wget (for downloading files).
* Adds PostgreSQL's official repository key.
* Sets up the PostgreSQL 15 repository.
* Installs postgresql-client-15(tools to interact with PostgreSQL databases).
### Some Modifications Made In controllers/authController.js
#### Use a Compatible bcrypt Alternative 
Instead of bcrypt, you can use bcryptjs, which is a pure JavaScript implementation and doesn't rely on native binaries. This avoids architecture issues entirely. 
*  Uninstall bcrypt
   ```bash 
      npm uninstall bcrypt
   ```
* Install bcryptjs
  ```bash
  npm install bcryptjs
  ```
* just modify the import of authController
  ``` bash
   const bcrypt = require('bcryptjs'); // Replace `bcrypt` with `bcryptjs`
  ```
## Docker-compose File Documentation
* create docker-compose.yml in the main project folder
* i have created docker-compose file defines that three services
    * ##### backend(Node.js app)
    * ##### Frontend (React app)
    * ##### Postgres (Database)
* They are connected via a shared network (souloxy-network) and use volumes for persistent storage.
