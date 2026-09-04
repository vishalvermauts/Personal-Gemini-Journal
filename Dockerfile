# Multi-stage production Dockerfile
FROM node:22-slim AS builder

WORKDIR /app

# Accept build argument for public Google Maps API key (Vite build-time injection)
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

COPY package*.json ./
RUN npm ci

COPY . .

# Build both Vite frontend and backend server bundle (dist/server.cjs)
RUN npm run build

# Production runner stage
FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend assets and server bundle
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
