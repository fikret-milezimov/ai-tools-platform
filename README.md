# Full-stack starter kit

Monorepo with a **Laravel 12** JSON API and a **Next.js 15** (React 19, TypeScript) frontend. It includes authentication (Laravel Sanctum), role-based access, a tools catalog with admin approval, ratings and comments, audit logging, and optional 2FA from the user profile.

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Laravel, PHP 8.2, Nginx |
| Database | MySQL 8 |
| Cache / session | Redis 7 |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- Ports **8200–8205** free on your machine (or change mappings in `docker-compose.yml` and adjust the frontend API base — see below)

## Quick start (Docker)

1. **Clone the repository** and enter the project root.

2. **Backend environment file**  
   If `backend/.env` does not exist, create it from the example:
   ```bash
   cp backend/.env.example backend/.env
   ```
   For Docker, the `php_fpm` service injects MySQL/Redis and `APP_URL`; your local `backend/.env` should still define `APP_KEY` after the first run (see `start.sh`).

3. **Start everything**
   ```bash
   chmod +x start.sh stop.sh laravel-setup.sh db-manage.sh
   ./start.sh
   ```
   This builds the PHP image, starts containers, and when needed runs `key:generate`, `composer install`, `migrate`, and basic permission fixes.

4. **Seed demo data (recommended for first run)**
   ```bash
   docker compose exec php_fpm php artisan db:seed
   ```
   Demo users, roles, categories, tags, and sample tools are defined in `backend/database/seeders/`. User emails and roles are in `UserSeeder.php`; the seeded password is **`password`** (change in production).

5. **Public URLs for uploaded tool screenshots**
   ```bash
   docker compose exec php_fpm php artisan storage:link
   ```

6. **Open the apps**
   - Frontend: [http://localhost:8200](http://localhost:8200)
   - Backend (Nginx): [http://localhost:8201](http://localhost:8201)
   - API health: [http://localhost:8201/api/status](http://localhost:8201/api/status)

7. **Stop**
   ```bash
   ./stop.sh
   ```
   or `docker compose down` (add `-v` only if you intend to wipe MySQL/Redis volumes).

### Optional: full Laravel setup script

After containers are up, for a clean Composer install, migrate, optional seed, and cache clears (interactive seed prompt):

```bash
./laravel-setup.sh
```

## Ports and services

| Host port | Service | Notes |
|-----------|---------|--------|
| 8200 | Next.js | Mapped to container port 3000 |
| 8201 | Nginx + Laravel | API under `/api` |
| 8202 | PHP-FPM | Exposed for debugging |
| 8203 | MySQL | `root` / DB name from compose |
| 8204 | Redis | Password set in compose |
| 8205 | Tools (Alpine) | Idle helper container |

Default DB name: `vibecode-full-stack-starter-kit_app`. Credentials match `docker-compose.yml` (also referenced in `db-manage.sh`).

## Configuration

- **Root `.env`** (optional): `PROJECT_NAME`, `FRONTEND_PORT`, `BACKEND_PORT`, etc. The running stack primarily uses **`docker-compose.yml`** for ports and `php_fpm` environment variables.
- **Frontend API base**: `frontend/src/lib/api.ts` sets `API_BASE` (default `http://localhost:8201`). If you change the host port for Nginx, update this file or refactor to use `process.env.NEXT_PUBLIC_API_URL` to match `docker-compose.yml`.
- **Backend**: See `backend/.env.example` for Laravel variables. Email 2FA and mail settings are documented there.

## Useful commands

```bash
# Logs
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f php_fpm

# Laravel (inside stack)
docker compose exec php_fpm php artisan migrate
docker compose exec php_fpm php artisan db:seed
docker compose exec php_fpm php artisan test

# Frontend (inside stack)
docker compose exec frontend npm run lint
docker compose exec frontend npm run build

# Database helper
./db-manage.sh connect
./db-manage.sh backup
```

## Project layout

```
├── frontend/          # Next.js app (src/app, components, lib)
├── backend/           # Laravel API (routes/api.php, app/, database/)
├── nginx/             # Nginx config for Laravel
├── docker/            # PHP image, php.ini, supervisor
├── mysql/init/        # MySQL init scripts
├── docker-compose.yml
├── start.sh / stop.sh
└── laravel-setup.sh
```

## Features (high level)

- **Auth**: Login API, Sanctum tokens, inactive users blocked from authenticated routes; tokens revoked on admin deactivation.
- **Roles**: e.g. `owner`, `pm`, `backend`, `frontend` — tool edit/delete limited to creator, owners, and PMs; others get read-only views.
- **Tools**: CRUD, categories/tags/roles, optional screenshot (stored under `storage/app/public`); public catalog lists approved tools.
- **Admin**: Pending approvals, audit logs, user management (owners), filters with debounced search.
- **Feedback**: Ratings and comments with moderation rules; audit events for ratings and comments.
- **Security**: Optional email/TOTP 2FA from profile (not forced on new users in seed).

## Troubleshooting

- **Port already in use**: Change host ports in `docker-compose.yml` and `frontend/src/lib/api.ts` (or env) consistently.
- **Migrations fail on fresh DB**: Ensure MySQL is healthy (`docker compose ps`), then `docker compose exec php_fpm php artisan migrate`.
- **Images 404 for tools**: Run `php artisan storage:link` in `php_fpm` and confirm `APP_URL` matches how the browser reaches the API.
- **Config changes ignored**: In local dev, avoid stale config cache: `docker compose exec php_fpm php artisan config:clear`.

## License

Add your license here if the project is published.
