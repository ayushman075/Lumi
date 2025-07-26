# Use Node.js LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app code
COPY . .

# Prisma: Generate the Prisma client
RUN npx prisma generate

# Expose the port (default to 3000, match your .env if different)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]
