FROM node:20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Allow overriding build-time configuration
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_BASE_PATH
ENV \
    VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_BASE_PATH=$VITE_BASE_PATH


RUN npm run build
# Production stage
FROM node:20-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
