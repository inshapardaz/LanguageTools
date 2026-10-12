FROM node:22-alpine AS build

WORKDIR /app

# Install packages
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --silent

# Build app
COPY . /app
RUN npm run build


FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY config/nginx/nginx.conf /etc/nginx/nginx.conf
COPY config/docker/env-config.js.template /etc/nginx/env-config.js.template
COPY config/docker/40-env-config.sh /docker-entrypoint.d/40-env-config.sh
RUN chmod +x /docker-entrypoint.d/40-env-config.sh

# Production defaults so the image starts even if the deployment sets nothing.
# Other environments (e.g. dev) must override these on the container.
ENV NODE_ENV=production \
    API_URL=https://api.nawishta.co.uk \
    MAIN_SITE=https://www.nawishta.co.uk

EXPOSE 80 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
