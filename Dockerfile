FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port 3000 for the application
EXPOSE 3000

# Command to run the application
CMD ["node", "app.js"]

