# infra — Local Geliştirme Altyapısı

## İçerik
- `docker/docker-compose.yml` — PostgreSQL 16 + Redis 7
- `scripts/seed.sql` — örnek tenant + kullanıcı seed verisi (geliştirme amaçlı)

## Kurulum adımları

### 1. Altyapıyı başlat
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```
Kontrol:
```bash
docker compose -f infra/docker/docker-compose.yml ps   # ikisi de "healthy" olmalı
```

| Servis | Adres | Kimlik |
|---|---|---|
| PostgreSQL | `localhost:5432` | db: `metropolbusiness`, user: `metropol`, pass: `metropol_local_dev` |
| Redis | `localhost:6379` | şifresiz (yalnızca local) |

### 2. Backend migration + çalıştırma
```bash
cd backend
dotnet restore
dotnet ef database update --project src/MetropolBusiness.Infrastructure --startup-project src/MetropolBusiness.Api
dotnet run --project src/MetropolBusiness.Api
```
Sağlık kontrolü: `GET http://localhost:5000/health`

### 3. Seed verisi (opsiyonel, migration sonrası)
```bash
docker exec -i mb-postgres psql -U metropol -d metropolbusiness < infra/scripts/seed.sql
```
PowerShell:
```powershell
Get-Content infra/scripts/seed.sql -Raw | docker exec -i mb-postgres psql -U metropol -d metropolbusiness
```

### Durdurma / sıfırlama
```bash
docker compose -f infra/docker/docker-compose.yml down        # durdur (veri kalır)
docker compose -f infra/docker/docker-compose.yml down -v     # durdur + veriyi SİL (dikkat)
```

## Notlar
- Compose'daki şifre yalnızca **local geliştirme** içindir; test/prod secret store'dan gelir.
- Seed verisi gerçek kişi/kart verisi içermez (CLAUDE.md kural 2/4).
