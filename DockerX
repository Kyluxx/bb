# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the project (if needed)
RUN npm run build

# Expose port (if your app runs on a specific port)
EXPOSE 3000

# Run the application
CMD ["npm", "run", "dev"]
