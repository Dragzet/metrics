# Платформа сбора и визуализации данных с датчиков (SensorHub)

## 1) Постановка

Цель: централизованный сбор и анализ показаний датчиков в производственных и складских помещениях.

### Основные сущности
- `User`: учетная запись, роль (`admin`, `operator`, `viewer`)
- `Sensor`: датчик (название, локация, статус)
- `Reading`: измерение датчика (значение, единица, время)

### Роли и права
- `admin`: полный доступ, управление пользователями, датчиками и показаниями
- `operator`: управление датчиками и показаниями, без управления пользователями
- `viewer`: только чтение датчиков и показаний

### Типовые сценарии
1. Оператор добавляет датчик и вносит новые показания.
2. Наблюдатель просматривает тренд показаний по датчику.
3. Администратор управляет пользователями и ролями.

## 2) Технологический стек

- Backend: Go (`net/http`, `database/sql`)
- DB: SQLite (`modernc.org/sqlite`)
- Auth: JWT (`github.com/golang-jwt/jwt/v5`)
- Password hashing: bcrypt (`golang.org/x/crypto/bcrypt`)
- Frontend: HTML/CSS/JS + Chart.js
- Контейнеризация: Docker

Подробный выбор зафиксирован в `docs/adr/0001-tech-stack.md`.

## 3) Реализованные требования ТЗ

- Клиент-серверное CRUD-приложение
- JWT-аутентификация и авторизация
- Ролевая модель с валидацией некорректных ролей
- Работа с БД и автоматическое заполнение тестовыми данными
- Визуализация показаний (линейный график Chart.js)
- SPA на React с роутингом и Sidebar

## 4) Быстрый старт

### Требования

- Go 1.22+
- Node.js 20+
- Docker + Docker Compose (опционально)

### Конфигурация окружения

Скопируйте `.env_example` в `.env` и задайте свои значения:

```bash
cp .env_example .env
```

Обязательные переменные:

| Переменная | Описание |
|---|---|
| `JWT_SECRET` | Секретный ключ для подписи JWT (сгенерировать: `openssl rand -hex 32`) |
| `SEED_ADMIN_PASSWORD` | Пароль администратора (seed) |
| `SEED_OPERATOR_PASSWORD` | Пароль оператора (seed) |
| `SEED_VIEWER_PASSWORD` | Пароль наблюдателя (seed) |

### Запуск локально (бэкенд)

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export SEED_ADMIN_PASSWORD=your-admin-pwd
export SEED_OPERATOR_PASSWORD=your-operator-pwd
export SEED_VIEWER_PASSWORD=your-viewer-pwd

go run .
```

Бэкенд будет доступен на `http://localhost:8080`.

### Запуск локально (фронтенд + бэкенд)

В одном терминале запустите бэкенд (см. выше), в другом — фронтенд:

```bash
cd project
npm install
npm run dev
```

Фронтенд будет доступен на `http://localhost:5173`, запросы к `/api/*` проксируются на бэкенд через Vite proxy.

### Запуск через Docker Compose (production-режим)

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export SEED_ADMIN_PASSWORD=your-admin-pwd
export SEED_OPERATOR_PASSWORD=your-operator-pwd
export SEED_VIEWER_PASSWORD=your-viewer-pwd

docker compose up --build
```

Приложение будет доступно на `http://localhost:8080` — nginx раздаёт статику и проксирует API-запросы на Go-бэкенд.

### Запуск через Docker Compose (dev-режим с hot-reload фронтенда)

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export SEED_ADMIN_PASSWORD=your-admin-pwd
export SEED_OPERATOR_PASSWORD=your-operator-pwd
export SEED_VIEWER_PASSWORD=your-viewer-pwd

docker compose --profile dev up --build
```

Запускаются два контейнера: бэкенд (Go + nginx) на `:8080` и Vite dev-сервер на `:5173` с hot-reload.

## 5) Структура проекта

```
.
├── main.go                 — HTTP-сервер и API маршруты
├── auth.go                 — JWT и хеширование паролей
├── db.go                   — миграции, seed, CRUD
├── models.go               — модели и валидация ролей
├── fuzz_test.go            — fuzz-тесты
├── Dockerfile              — multi-stage сборка (Go + Node + nginx)
├── docker-compose.yml      — сервисы app (production) и frontend (dev)
├── nginx.conf              — nginx: статика + прокси /api/
├── .env_example            — шаблон конфигурации окружения
│
├── project/                — клиентская часть (React + Vite)
│   ├── src/
│   │   ├── api/            — клиент API (auth, sensors, readings, users)
│   │   ├── components/     — Charts, Modal, Sidebar, StatusBadge
│   │   ├── contexts/       — AuthContext (JWT-токен в localStorage)
│   │   └── pages/          — LoginPage, DashboardPage, SensorsPage и др.
│   └── vite.config.ts      — Vite proxy для разработки
│
├── migrations/             — SQL-миграции (schema.sql, seed.sql)
├── docs/                   — архитектура, UML, ADR, деплой, презентация
└── metrics.db              — SQLite БД (создаётся автоматически)
```

## 6) API

| Метод | Путь | Аутентификация | Роль |
|---|---|---|---|
| POST | `/api/login` | — | — |
| GET | `/api/me` | JWT | любая |
| GET | `/api/users` | JWT | admin |
| POST | `/api/users` | JWT | admin |
| PUT | `/api/users/:id` | JWT | admin |
| DELETE | `/api/users/:id` | JWT | admin |
| GET | `/api/sensors` | JWT | любая |
| POST | `/api/sensors` | JWT | admin, operator |
| PUT | `/api/sensors/:id` | JWT | admin, operator |
| DELETE | `/api/sensors/:id` | JWT | admin |
| GET | `/api/readings` | JWT | любая |
| POST | `/api/readings` | JWT | admin, operator |
| GET | `/healthz` | — | — |

## 7) Фаззинг

Добавлены fuzz-тесты для ключевых инвариантов:

| Тест | Что проверяет |
|---|---|
| `FuzzValidateRole` | валидация ролей (admin/operator/viewer) |
| `FuzzParseIDFromPath` | парсинг ID из URL-пути |
| `FuzzJWTBuildAndParse` | round-trip JWT (пустые/длинные секреты) |
| `FuzzParseJWTMalformed` | повреждённые токены (без паники) |
| `FuzzHashPassword` | граничные длины (1..200+), unicode, null-байты |
| `FuzzHashPasswordInvalidHash` | некорректные bcrypt-хеши (без паники) |
| `FuzzStoreCreateReading` | NaN, ±Inf, MaxFloat64, 0, отрицательные значения |

Запуск:

```bash
# Все тесты
go test ./...

# Fuzz-тесты (10 секунд на каждый)
go test -fuzz=Fuzz -fuzztime=10s ./...
```

## 8) Безопасность

- **JWT_SECRET**: обязателен, задаётся через переменную окружения. Приложение не стартует без него.
- **Seed-пароли**: задаются через `SEED_ADMIN_PASSWORD`, `SEED_OPERATOR_PASSWORD`, `SEED_VIEWER_PASSWORD`. Хранятся в bcrypt.
- **Frontend URL**: настраивается через `VITE_API_URL` (по умолчанию — относительный путь `/api` через nginx).
- **CORS**: ограничен списком разрешённых источников (переменная `CORS_ORIGIN`).
- **Секреты в коде**: отсутствуют — все конфиденциальные данные только через env.
