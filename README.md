# Schedule AD Blocker

Веб-приложение для планирования задач по включению и отключению учетных записей пользователей в Active Directory.

## 🚀 О проекте

Это full-stack приложение, которое предоставляет удобный пользовательский интерфейс для создания, просмотра и управления разовыми задачами. Каждая задача представляет собой операцию (включение или отключение) над учетной записью пользователя в AD, которая должна быть выполнена в определенную дату.

Бэкенд построен на NestJS и использует GraphQL для API, а фронтенд — на React.

## ✨ Основные возможности

*   **Управление задачами**: CRUD-операции (создание, чтение, обновление, удаление) для задач.
*   **Планирование**: Задачи выполняются автоматически в указанную дату с помощью планировщика.
*   **Валидация**: Встроенная валидация данных на стороне сервера для обеспечения их корректности.
*   **Современный API**: Использование GraphQL для гибкого и эффективного взаимодействия между клиентом и сервером.

## 🛠️ Технологический стек

*   **Бэкенд**:
    *   [NestJS](https://nestjs.com/)
    *   [GraphQL](https://graphql.org/)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [TypeORM](https://typeorm.io/) (или другая ORM)
    *   [PostgreSQL](https://www.postgresql.org/) (или другая БД)

*   **Фронтенд**:
    *   [React](https://reactjs.org/)
    *   [Apollo Client](https://www.apollographql.com/docs/react/)
    *   [TypeScript](https://www.typescriptlang.org/)

## 📋 Требования

Перед началом работы убедитесь, что у вас установлены:

*   [Node.js](https://nodejs.org/) (v16.x или выше)
*   [npm](https://www.npmjs.com/) или [yarn](https://yarnpkg.com/)
*   [Git](https://git-scm.com/)
*   Запущенный экземпляр базы данных (например, PostgreSQL)

## ⚙️ Установка и запуск

1.  **Клонируйте репозиторий:**

    ```bash
    git clone <URL-вашего-репозитория>
    cd schedule-ad-blocker
    ```

2.  **Настройка бэкенда:**

    Предполагается, что код бэкенда находится в папке `server`.

    ```bash
    cd server
    ```

    Установите зависимости:

    ```bash
    npm install
    ```

    Создайте файл `.env` в корне папки `server` (вы можете скопировать `.env.example`, если он есть) и заполните его необходимыми переменными окружения:

    ```env
    # Пример .env файла
    DB_HOST=localhost
    DB_PORT=5432
    DB_USERNAME=postgres
    DB_PASSWORD=secret
    DB_DATABASE=schedule_ad
    JWT_SECRET=your-super-secret-key
    ```

    Запустите бэкенд в режиме разработки:

    ```bash
    npm run start:dev
    ```

    Сервер будет доступен по адресу `http://localhost:3000`.
    GraphQL Playground: `http://localhost:3000/graphql`.

3.  **Настройка фронтенда:**

    Предполагается, что код фронтенда находится в папке `client`.

    ```bash
    # из корня проекта
    cd client 
    ```

    Установите зависимости:

    ```bash
    npm install
    ```

    Если требуется, создайте файл `.env` в корне папки `client` для указания URL бэкенда.

    ```env
    # Пример .env для React
    REACT_APP_GRAPHQL_ENDPOINT=http://localhost:3000/graphql
    ```

    Запустите фронтенд:

    ```bash
    npm start
    ```

    Клиентское приложение будет доступно по адресу `http://localhost:3001` (или другому порту, который использует Create React App).

---