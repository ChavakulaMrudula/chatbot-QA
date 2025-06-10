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
``` bash
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```
