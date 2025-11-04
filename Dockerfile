# Use a lightweight Node.js base image
FROM node:14-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency files and install dependencies (cached if unchanged)
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application
COPY . .

# Expose application port
EXPOSE 3000

# Start the app
CMD ["node", "app.js"]

