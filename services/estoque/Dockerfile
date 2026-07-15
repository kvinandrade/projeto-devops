# Build: docker build -f services/estoque/Dockerfile -t lojaveloz/estoque:1.0.0 .
FROM node:20-alpine AS deps
WORKDIR /app
COPY services/estoque/package.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app \
  && apk add --no-cache wget
COPY --from=deps /app/node_modules ./node_modules
COPY services/estoque/package.json ./
COPY services/estoque/src ./src
COPY services/shared ./shared
USER app
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3003/health || exit 1
CMD ["node", "src/index.js"]
