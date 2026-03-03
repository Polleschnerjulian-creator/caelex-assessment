FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ ./dist/
COPY config/ ./config/

RUN addgroup -S sentinel && adduser -S sentinel -G sentinel
RUN mkdir -p /data/keys && chown -R sentinel:sentinel /data
USER sentinel

VOLUME ["/data", "/config"]
EXPOSE 8443

HEALTHCHECK --interval=60s --timeout=5s --retries=3 \
  CMD wget -q -O - http://localhost:8443/api/status || exit 1

CMD ["node", "dist/index.js"]
