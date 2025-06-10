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
### some modifications made in controllers/authController.js
#### Use a Compatible bcrypt Alternative 
Instead of bcrypt, you can use bcryptjs, which is a pure JavaScript implementation and doesn't rely on native binaries. This avoids architecture issues entirely. 
• Uninstall bcrypt 
                          npm uninstall bcrypt 
• Install bcryptjs:  
                               npm install bcryptjs 
• Update your code to use bcryptjs instead of bcrypt. The API is the same, so you only need to 
change the require statement:  
                          const bcrypt = require('bcryptjs'); // Replace `bcrypt` with `bcryptjs`
