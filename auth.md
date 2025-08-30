# Система аутентификации LDAP + JWT

## Обзор

В проекте реализована двухуровневая система аутентификации:
- **LDAP (Active Directory)** - для первичной аутентификации пользователей
- **JWT токены** - для авторизации последующих запросов

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Клиент        │    │   NestJS App    │    │   LDAP Server   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. {username, pwd}   │                       │
         │──────────────────────▶│                       │
         │                       │ 2. LDAP проверка      │
         │                       │──────────────────────▶│
         │                       │ 3. Результат          │
         │                       │◀──────────────────────│
         │ 4. {accessToken}      │                       │
         │◀──────────────────────│                       │
         │                       │                       │
         │ 5. Bearer <token>     │                       │
         │──────────────────────▶│                       │
         │                       │ 6. JWT проверка       │
         │                       │                       │
         │ 7. Защищенные данные │                       │
         │◀──────────────────────│                       │
```

## Компоненты системы

### 1. Guards (Защитники)

#### GqlAuthGuard (LDAP аутентификация)
```typescript
@UseGuards(GqlAuthGuard)
async auth(@Args('data') input: LoginInput) {
  // LDAP проверка логина/пароля
}
```

**Назначение**: Первичная аутентификация через Active Directory
**Стратегия**: `LdapStrategy`
**Когда используется**: При входе пользователя в систему

#### JwtAuthGuard (JWT аутентификация)
```typescript
@UseGuards(JwtAuthGuard)
async protectedMethod() {
  // JWT проверка токена
}
```

**Назначение**: Проверка JWT токенов для защищенных эндпоинтов
**Стратегия**: `JwtStrategy`
**Когда используется**: При всех последующих запросах

### 2. Strategies (Стратегии)

#### LdapStrategy
```typescript
export class LdapStrategy extends PassportStrategy(Strategy, 'ldap') {
  async validate(playground): Promise<any> {
    // Проверка доступа к приложению
    if (!playground.distinguishedName.includes(this.configService.getOrThrow('LDAP_ACCESS_FILTER'))) {
      throw new UnauthorizedException('Пользователь не имеет доступа к приложению');
    }
    return playground;
  }
}
```

**Функции**:
- Подключение к Active Directory
- Проверка логина/пароля
- Валидация прав доступа к приложению
- Возврат данных пользователя из LDAP

#### JwtStrategy
```typescript
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  async validate(payload) {
    return payload; // Возвращает данные из JWT токена
  }
}
```

**Функции**:
- Извлечение JWT токена из заголовка Authorization
- Валидация JWT токена
- Возврат payload токена

### 3. AuthService

```typescript
export class AuthService {
  async auth(res: Response, username: string) {
    const {accessToken, refreshToken} = await this.generateToken(username)
    
    // Устанавливает refreshToken в httpOnly cookie
    this.setCookies(res, refreshToken, new Date(Date.now() + 1000 * 60 * 60 * 24 * 7))
    
    return {accessToken} // Возвращает accessToken клиенту
  }

  async refreshToken(res: Response, req: Request) {
    const refreshToken = req.cookies['refreshToken']
    // Обновление JWT токенов
  }
}
```

**Функции**:
- Генерация access и refresh токенов
- Управление cookies
- Обновление токенов

## Flow аутентификации

### Этап 1: Первичная аутентификация (LDAP)

```
1. Клиент отправляет GraphQL мутацию auth с {username, password}
2. GqlAuthGuard перехватывает запрос
3. Вызывает LdapStrategy.validate(username, password)
4. LdapStrategy подключается к Active Directory
5. Проверяет логин/пароль
6. Валидирует права доступа к приложению
7. Если успешно → req.user заполняется LDAP данными
8. Вызывается AuthService.auth()
9. Генерируются JWT токены
10. refreshToken сохраняется в httpOnly cookie
11. accessToken возвращается клиенту
```

### Этап 2: Последующие запросы (JWT)

```
1. Клиент отправляет запрос с Authorization: Bearer <accessToken>
2. JwtAuthGuard перехватывает запрос
3. Вызывает JwtStrategy.validate()
4. JwtStrategy извлекает и валидирует JWT токен
5. Если успешно → req.user заполняется данными из JWT payload
6. Запрос передается к резолверу
7. Резолвер выполняется с доступом к req.user
```

### Этап 3: Обновление токенов

```
1. accessToken истекает
2. Клиент отправляет запрос с refreshToken из cookie
3. JwtAuthGuard проверяет refreshToken
4. Если валиден → вызывается AuthService.refreshToken()
5. Генерируются новые access и refresh токены
6. Обновляется cookie с refreshToken
7. Возвращается новый accessToken
```

## Данные пользователя

### После LDAP аутентификации (req.user)
```typescript
{
  cn: "Иванов Иван Иванович",           // ФИО
  distinguishedName: "CN=Иванов Иван Иванович,OU=IT,DC=company,DC=com",
  sAMAccountName: "ivanov.ii",          // Логин
  title: "Инженер",                     // Должность
  department: "IT",                     // Отдел
  company: "Company Name",              // Компания
  memberOf: ["CN=IT_Users,OU=Groups"], // Группы
  userAccountControl: "512"             // Статус аккаунта
}
```

### После JWT аутентификации (req.user)
```typescript
{
  username: "ivanov.ii"  // Из JWT payload
}
```

## Конфигурация

### Переменные окружения
```env
# LDAP
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

### GraphQL контекст
```typescript
GraphQLModule.forRoot({
  context: ({ req }) => ({ req })
})
```

## Использование в резолверах

### Защита LDAP аутентификацией
```typescript
@Mutation(() => AuthModel)
@UseGuards(GqlAuthGuard)
async auth(@Args('data') input: LoginInput, @Context('res') res) {
  // req.user содержит LDAP данные
  return await this.authService.auth(res, input.username)
}
```

### Защита JWT аутентификацией
```typescript
@Query(() => [Schedule])
@UseGuards(JwtAuthGuard)
async getSchedules(@CurrentUser() user: any) {
  // user содержит данные из JWT payload
  return this.scheduleService.findByUsername(user.username)
}
```

### Получение пользователя через контекст
```typescript
@Query(() => User)
@UseGuards(JwtAuthGuard)
async getCurrentUser(@Context() context) {
  return context.req.user
}
```

## Безопасность

### JWT токены
- **accessToken**: Короткоживущий (15 минут)
- **refreshToken**: Долгоживущий (7 дней), хранится в httpOnly cookie
- **Алгоритм**: HS256
- **Хранение**: accessToken в памяти клиента, refreshToken в cookie

### LDAP
- **Подключение**: Через сервисную учетную запись
- **Фильтр доступа**: Ограничение по организационным единицам
- **Таймауты**: 5 секунд на подключение и операции

### Cookies
- **httpOnly**: true (защита от XSS)
- **secure**: true в продакшене (только HTTPS)
- **sameSite**: lax (защита от CSRF)

## Обработка ошибок

### LDAP ошибки
```typescript
// Неверные учетные данные
throw new UnauthorizedException('Неверный логин или пароль')

// Нет доступа к приложению
throw new UnauthorizedException('Пользователь не имеет доступа к приложению')

// Ошибка подключения к AD
throw new ConflictException(`Ошибка подключения к AD: ${error.message}`)
```

### JWT ошибки
```typescript
// Токен истек
throw new UnauthorizedException('Токен истек')

// Неверный токен
throw new UnauthorizedException('Неверный токен')

// Отсутствует refreshToken
throw new UnauthorizedException('Пользователь не авторизован или устарел токен обновления')
```

## Мониторинг и логирование

### Winston логгер
```typescript
// Успешные подключения к AD
logger.info('Подключение к АД успешно выполнено.')

// Ошибки подключения
logger.error(`Ошибка при подключении к АД - ${err.message}.`)

// Операции с пользователями
logger.info(`Изменение статуса пользователя: ${login} по приказу ${order}`)
```

## Тестирование

### Unit тесты
```typescript
describe('AuthService', () => {
  it('should generate JWT tokens', async () => {
    const result = await authService.auth(mockResponse, 'testuser')
    expect(result.accessToken).toBeDefined()
  })
})
```

### E2E тесты
```typescript
describe('Authentication (e2e)', () => {
  it('should authenticate with valid LDAP credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `mutation { auth(data: { username: "test", password: "test" }) { accessToken } }`
      })
    
    expect(response.body.data.auth.accessToken).toBeDefined()
  })
})
```

## Troubleshooting

### Проблемы с LDAP
1. **Ошибка подключения**: Проверить LDAP_URL и доступность сервера
2. **Ошибка аутентификации**: Проверить LDAP_ADMIN_LOGIN и LDAP_ADMIN_PASSWORD
3. **Пользователь не найден**: Проверить LDAP_DN и searchFilter

### Проблемы с JWT
1. **Токен истек**: Проверить JWT_ACCESS_TOKEN_TTL
2. **Ошибка валидации**: Проверить JWT_SECRET
3. **Cookie не устанавливается**: Проверить настройки sameSite и secure

### Общие проблемы
1. **Guard не срабатывает**: Проверить импорты и регистрацию в модуле
2. **req.user undefined**: Проверить GraphQL контекст
3. **CORS ошибки**: Проверить настройки Apollo Server

## Рекомендации по развитию

1. **Добавить rate limiting** для предотвращения брутфорс атак
2. **Реализовать blacklist токенов** для logout
3. **Добавить аудит** аутентификационных событий
4. **Реализовать 2FA** для критических операций
5. **Добавить health checks** для LDAP сервера
