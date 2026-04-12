# Развертывание в облаке (пример: Render)

## Вариант A: Web Service на Render
1. Создать новый Web Service из Git-репозитория.
2. Build command:
   - `go build -o app .`
3. Start command:
   - `./app`
4. Environment variables:
   - `APP_ADDR=:10000`
   - `DB_PATH=file:metrics.db?_pragma=foreign_keys(1)`
   - `JWT_SECRET=<your-strong-secret>`
5. В Render задать `PORT=10000`.

## Вариант B: Docker deploy (Fly.io / любой контейнерный хостинг)
- Использовать `Dockerfile` из проекта.
- Открыть порт `8080`.
- Передать переменные `JWT_SECRET`, `APP_ADDR`, `DB_PATH`.

## Проверка
- Открыть `/healthz`, ожидается `{"status":"ok"}`.
- Выполнить вход под тестовым пользователем.
- Проверить CRUD для датчиков и чтение показаний.

