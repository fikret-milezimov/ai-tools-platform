# Full-stack starter kit

Production-style monorepo containing a **Laravel 12** JSON API backend and a **Next.js 15** frontend (React 19 + TypeScript). The platform includes authentication with Laravel Sanctum, role-based access control, AI tools management, admin approval workflows, ratings and comments, audit logging, and optional 2FA support.

## 🚀 Live Demo

The application is deployed on AWS EC2 using Docker Compose.

- Frontend: http://34.198.222.7:8200/login
- Backend API: http://34.198.222.7:8201/api/status

## Project overview

This project simulates an internal company platform where teams can discover, review, and manage AI tools in a centralized environment.

Different roles such as owners, project managers, backend developers, frontend developers, QA engineers, and designers can collaborate through a shared tools catalog with moderation and access control.

## Tech stack

| Layer           | Technology                                     |
| --------------- | ---------------------------------------------- |
| Frontend        | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend         | Laravel 12, PHP 8.2, Nginx                     |
| Database        | MySQL 8                                        |
| Cache / Session | Redis 7                                        |
| Authentication  | Laravel Sanctum                                |
| Containers      | Docker Compose                                 |

---

# Prerequisites

Before starting, make sure you have:

* [Docker](https://docs.docker.com/get-docker/)
* Docker Compose v2
* Ports **8200–8205** available on your machine

If you change the exposed ports in `docker-compose.yml`, update the frontend API base URL accordingly.

---

# Quick start (Docker)

## 1. Clone the repository

```bash
git clone <repository-url>
cd <project-name>
```

---

## 2. Create backend environment file

If `backend/.env` does not exist:

```bash
cp backend/.env.example backend/.env
```

---

## 3. Start the application

```bash
chmod +x start.sh stop.sh laravel-setup.sh db-manage.sh
./start.sh
```

The startup script automatically:

* builds the PHP image
* starts all containers
* installs Composer dependencies (if needed)
* generates the Laravel app key
* runs migrations
* applies permission fixes

---

## 4. Seed demo data

```bash
docker compose exec php_fpm php artisan db:seed
```

The project includes demo:

* users
* roles
* categories
* tags
* sample AI tools

Default seeded password:

```txt
password
```

Seeders are located in:

```txt
backend/database/seeders/
```

---

## 5. Create public storage link

```bash
docker compose exec php_fpm php artisan storage:link
```

Required for uploaded tool screenshots.

---

## 6. Open the application

| Service    | URL                              |
| ---------- | -------------------------------- |
| Frontend   | http://localhost:8200            |
| Backend    | http://localhost:8201            |
| API Status | http://localhost:8201/api/status |

---

## 7. Stop the containers

```bash
./stop.sh
```

or:

```bash
docker compose down
```

Use `-v` only if you want to remove MySQL and Redis volumes.

---

# Available services

| Host Port | Service                |
| --------- | ---------------------- |
| 8200      | Next.js frontend       |
| 8201      | Nginx + Laravel API    |
| 8202      | PHP-FPM                |
| 8203      | MySQL                  |
| 8204      | Redis                  |
| 8205      | Helper tools container |

---

# Project structure

```txt
├── frontend/          # Next.js frontend application
├── backend/           # Laravel API backend
├── nginx/             # Nginx configuration
├── docker/            # PHP image and configuration
├── mysql/init/        # MySQL initialization scripts
├── docker-compose.yml
├── start.sh
├── stop.sh
└── laravel-setup.sh
```

---

# Core features

## Authentication & Security

* Laravel Sanctum authentication
* Role-based access control
* Optional 2FA support
* Inactive users blocked from protected routes
* Token revocation on admin deactivation

## AI Tools Management

* Create, edit, and delete AI tools
* Categories and tags support
* Role-specific recommendations
* Screenshot uploads
* Public approved tools catalog

## Admin Features

* Pending tools approval workflow
* User management
* Audit logging
* Search and filtering

## Community Feedback

* Ratings system
* Comments and moderation
* Audit events for ratings and comments

---

# Configuration

## Frontend API base URL

The frontend API configuration is located in:

```txt
frontend/src/lib/api.ts
```

Default API URL:

```txt
http://localhost:8201
```

If backend ports change, update this value accordingly.

---

## Backend configuration

Laravel environment variables are defined in:

```txt
backend/.env.example
```

This includes:

* database settings
* Redis configuration
* mail configuration
* 2FA settings
* application URLs

---

# Useful commands

## Logs

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f php_fpm
```

## Laravel commands

```bash
docker compose exec php_fpm php artisan migrate
docker compose exec php_fpm php artisan db:seed
docker compose exec php_fpm php artisan test
```

## Frontend commands

```bash
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

## Database helper

```bash
./db-manage.sh connect
./db-manage.sh backup
```

---

# Troubleshooting

## Port already in use

Update the host ports in:

```txt
docker-compose.yml
```

and update the frontend API URL if necessary.

---

## Images not loading

Run:

```bash
docker compose exec php_fpm php artisan storage:link
```

Also verify that:

* `APP_URL` matches the backend URL
* uploaded files exist in `storage/app/public`

---

## Laravel config changes not applied

Clear the configuration cache:

```bash
docker compose exec php_fpm php artisan config:clear
```

---

## Database migration issues

Check container health:

```bash
docker compose ps
```

Then rerun migrations:

```bash
docker compose exec php_fpm php artisan migrate
```
# 🤖 AI-assisted Development

This project was developed with the assistance of AI tools such as Cursor AI, Claude Code, and ChatGPT.

The AI workflow documentation and starter prompts can be found in:
- [AI_AGENTS.md](./AI_AGENTS.md)

