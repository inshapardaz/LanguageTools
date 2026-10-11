# LanguageTools is a front-end over the API's language tools: build the Vite app, serve it with nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY src/Nawishta.Web/ClientApp/package.json src/Nawishta.Web/ClientApp/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY src/Nawishta.Web/ClientApp/ ./
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:8080/health || exit 1
