## Schedule AD Blocker (Backend)

Бэкенд‑сервис для планирования включения/отключения учетных записей пользователей в Active Directory по расписанию.

Сервис написан на **NestJS**, использует **GraphQL** как API‑слой, **PostgreSQL + Prisma** как хранилище, интегрируется с **Active Directory по LDAP** и использует **cron‑задачи** для исполнения расписаний.

### Основной функционал

- **Управление задачами**:
  - разовые задачи (`onetime`) для включения/отключения учеток в указанный момент времени;
  - повторяющиеся задачи (`recall`, `schedule`) и связанные задания cron‑планировщика;
- **Интеграция с Active Directory (LDAP)**:
  - аутентификация пользователей через AD;
  - управление атрибутами пользователей (в т.ч. `logonHours`, статус учетной записи);
  - проверка прав доступа к приложению.
- **Аутентификация и авторизация**:
  - вход по LDAP с выдачей JWT‑токенов;
  - защита GraphQL‑резолверов через `GqlAuthGuard` и `JwtAuthGuard`.
- **Планировщик задач**:
  - использование `@nestjs/schedule` и `cron` для запуска задач по расписанию;
  - отдельные cron‑обработчики для старта/окончания задач, повторяющихся задач и обработки нештатных ситуаций.
- **Логирование и аудит**:
  - логирование через **winston** и **winston‑daily‑rotate‑file** в папку `logs`;
  - отдельные логи для cron‑операций.

### Технологический стек

- **Платформа**: Node.js, NestJS (GraphQL, Apollo Server)
- **Язык**: TypeScript
- **БД**: PostgreSQL (доступ через Prisma)
- **Аутентификация/авторизация**:
  - LDAP (Active Directory) — `ldapjs`, `ldapauth-fork`, `passport-ldapauth`;
  - JWT — `@nestjs/jwt`, `passport-jwt`.
- **Планировщик**: `@nestjs/schedule`, `cron`
- **Логирование**: `winston`, `nest-winston`, `winston-daily-rotate-file`

### Структура проекта (основное)

- `src/app.module.ts` — корневой модуль приложения.
- `src/auth` — аутентификация:
  - guards: `GqlAuthGuard`, `JwtAuthGuard`;
  - стратегии: `JwtStrategy`;
  - `AuthService` и GraphQL‑резолвер для входа и обновления токенов.
- `src/ldap` — работа с Active Directory:
  - `ldap.service.ts` — подключение к AD, поиск и изменение пользователей, работа с `logonHours`;
  - `logonHours.md` — подробная документация по работе с атрибутом `logonHours`.
- `src/schedule` — модуль расписаний:
  - GraphQL‑модели и инпуты;
  - `cron-task` — набор cron‑обработчиков для применения задач (старт/стоп, разовые и повторяющиеся задачи, обработка не найденных данных);
  - `logs` — модуль логов для задач расписаний.
- `src/onetime`, `src/recall`, `src/otdel` — бизнес‑модули для разных типов задач/сущностей.
- `src/prisma` — модуль интеграции с Prisma и PostgreSQL.
- `src/config` — конфигурация GraphQL (`graphql.config.ts`) и логгера (`winston.config.ts`).
- `logs` — файлы логов приложения и cron‑задач.

### Требования

- **Node.js**: версия 18+ (рекомендуется LTS)
- **npm** (или `pnpm` / `yarn`)
- **PostgreSQL**: доступ к экземпляру БД (локальному или удаленному)
- Доступ к **Active Directory** по LDAP (сервер, порт, сервисная учетная запись)

### Переменные окружения (пример)

Фактический список переменных окружения задается в вашем `.env` в корне проекта. Ниже — примерная структура (названия могут отличаться от реальных, ориентируйтесь на текущий `.env` и конфиги):

```env
# Приложение
NODE_ENV=development
PORT=3000

# Подключение к БД (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=schedule_ad

# Prisma
DATABASE_URL=postgresql://postgres:secret@localhost:5432/schedule_ad?schema=public

# LDAP / Active Directory
LDAP_URL=ldap://dc.company.com:389
LDAP_DN=DC=company,DC=com
LDAP_ADMIN_LOGIN=CN=ServiceAccount,OU=ServiceAccounts,DC=company,DC=com
LDAP_ADMIN_PASSWORD=service_password
LDAP_ACCESS_FILTER=OU=IT

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=7d
```

Актуальный и полный перечень переменных смотрите:

- по коду в `auth/config/jwt.config.ts`, `config/graphql.config.ts`, `config/winston.config.ts`;
- в файле `auth.md` (описание LDAP + JWT);
- в вашем реальном `.env`.

### Установка и локальный запуск

1. **Клонировать репозиторий**

```bash
git clone <URL-репозитория>
cd schedule-ad-blocker
```

2. **Установить зависимости**

```bash
npm install
```

3. **Настроить `.env`**

- создать файл `.env` в корне проекта (или отредактировать существующий);
- прописать параметры подключения к PostgreSQL, AD и JWT (см. пример выше).

4. **Запустить миграции Prisma** (если используются миграции)

```bash
npx prisma migrate deploy
```

или в режиме разработки:

```bash
npx prisma migrate dev
```

5. **Запуск в режиме разработки**

```bash
npm run start:dev
```

- HTTP‑сервер: `http://localhost:3000`
- GraphQL endpoint: `http://localhost:3000/graphql`

6. **Сборка и запуск в продакшене**

```bash
npm run build
npm run start:prod
```

Приложение будет запускаться из `dist/main.js`.

### Скрипты npm

- `npm run start` — обычный запуск NestJS.
- `npm run start:dev` — запуск в режиме разработки с `--watch`.
- `npm run start:prod` — запуск собранного кода (`dist/main.js`).
- `npm run build` — сборка проекта.
- `npm run lint` — проверка ESLint.
- `npm run test`, `npm run test:e2e` — unit‑ и e2e‑тесты.

### Планировщик и cron‑задачи

Модуль `schedule` использует `@nestjs/schedule` и `cron` для:

- периодической проверки и исполнения разовых задач (`onetime`);
- старта/остановки повторяющихся задач (`recall`, общие расписания);
- обработки крайних случаев (например, не найденные записи, отложенная обработка).

Конкретная реализация находится в:

- `schedule/cron-task/*.ts`;
- `schedule/cron-task.service.ts`.

### Аутентификация и доступ к API

- Вход происходит через LDAP‑аутентификацию (см. `auth.md` и модуль `auth`);
- после успешного входа выдаются JWT‑токены (access/refresh);
- защищенные GraphQL‑резолверы используют `JwtAuthGuard` и `GqlAuthGuard`.

### Деплой

Инструкция по деплою на **Windows (без Docker)**, включая запуск как службы, находится в файле `DEPLOY_WINDOWS.md`.

Фронтенд‑часть приложения разрабатывается и деплоится отдельно (в другом репозитории) и в рамках этого README не описывается.
