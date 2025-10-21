# Development image for hot-reload
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies during build
COPY app/package*.json ./
RUN npm install --legacy-peer-deps

# Copy templates so they're available in public folder
COPY templates /app/public/templates

# Source code will be mounted as volume at runtime

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]
