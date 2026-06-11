# Platform (Metropol) admin paneli (admin/) — SPA build + nginx.
# Build bağlamı: REPO KÖKÜ (shared/types için): docker build -f admin/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /repo
COPY shared/ shared/
COPY admin/package.json admin/package-lock.json admin/
RUN cd admin && npm ci
COPY admin/ admin/
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN cd admin && npm run build

FROM nginx:1.27-alpine
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/admin/dist /usr/share/nginx/html
EXPOSE 80
