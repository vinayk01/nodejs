FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency manifests first for better build caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose application port (update to match your app)
EXPOSE 9000

# Run the application
CMD ["node", "app.js"]

