# Firma yönetim paneli (web/) — SPA build + nginx (aigap-deploy-template deseni).
# Build bağlamı: REPO KÖKÜ (shared/types '@shared' alias'ı için gerekir):
#   docker build -f web/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /repo
COPY shared/ shared/
COPY web/package.json web/package-lock.json web/
RUN cd web && npm ci
COPY web/ web/
# Aynı origin'den /api proxy'lenir (nginx) — CORS gerekmez.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN cd web && npm run build

FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/web/dist /usr/share/nginx/html
EXPOSE 80
