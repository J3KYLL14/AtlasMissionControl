# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy build output to nginx public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Custom nginx config: serves SPA, proxies /api and /ws to backend
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
