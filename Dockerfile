FROM node:18-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/tsconfig.json ./
RUN npm install
COPY backend/src ./src
RUN npm run build

FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html ./
RUN npm install
COPY frontend/src ./src
RUN npm run build

FROM node:18-alpine
WORKDIR /app

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package.json ./
COPY --from=backend-build /app/backend/src/seed.js ./dist/seed.js

COPY --from=frontend-build /app/frontend/dist ./public

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_STORAGE=/app/data/shuttle.db

EXPOSE 3001

CMD ["sh", "-c", "node dist/seed.js && node dist/index.js"]
