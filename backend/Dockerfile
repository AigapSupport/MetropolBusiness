# MetropolBusiness API — çok aşamalı build (aigap-deploy-template 'app' servisi).
# Build bağlamı: ./backend

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Önce csproj'lar — restore katmanı cache'lenir, kod değişiminde tekrar inmez.
COPY MetropolBusiness.sln Directory.Build.props ./
COPY src/MetropolBusiness.Domain/MetropolBusiness.Domain.csproj src/MetropolBusiness.Domain/
COPY src/MetropolBusiness.Application/MetropolBusiness.Application.csproj src/MetropolBusiness.Application/
COPY src/MetropolBusiness.Infrastructure/MetropolBusiness.Infrastructure.csproj src/MetropolBusiness.Infrastructure/
COPY src/MetropolBusiness.Integration.Metropol/MetropolBusiness.Integration.Metropol.csproj src/MetropolBusiness.Integration.Metropol/
COPY src/MetropolBusiness.Integration.Gemini/MetropolBusiness.Integration.Gemini.csproj src/MetropolBusiness.Integration.Gemini/
COPY src/MetropolBusiness.Api/MetropolBusiness.Api.csproj src/MetropolBusiness.Api/
RUN dotnet restore src/MetropolBusiness.Api/MetropolBusiness.Api.csproj

COPY src/ src/
RUN dotnet publish src/MetropolBusiness.Api/MetropolBusiness.Api.csproj \
    -c Release -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
# wget: deploy.sh health adımı + compose healthcheck container içinden çağırır.
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .

# Konteyner içinde tüm arabirimlere bağlan (Traefik/nginx iç ağdan ulaşır; port publish edilmez).
# DİKKAT: appsettings.json'daki Kestrel Endpoints bunu ezer — compose'da
# Kestrel__Endpoints__Http__Url=http://0.0.0.0:8080 de ayrıca verilir.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "MetropolBusiness.Api.dll"]
