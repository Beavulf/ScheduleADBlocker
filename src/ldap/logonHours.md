# Работа с logonHours в Active Directory

## Что такое logonHours

`logonHours` - это атрибут Active Directory, который определяет, в какие часы пользователь может входить в систему. Он возвращает **Buffer** (бинарные данные), представляющий собой 21 байт (168 бит), где каждый бит соответствует одному часу в неделе.

## Структура logonHours

- **168 бит** = 7 дней × 24 часа
- Начинается с **воскресенья 00:00**
- Каждый бит: `1` = разрешено, `0` = запрещено
- Порядок дней: Вс(0), Пн(1), Вт(2), Ср(3), Чт(4), Пт(5), Сб(6)

## Примеры использования

### 1. Чтение и парсинг logonHours

```typescript
private parseLogonHours(logonHoursBuffer: Buffer): {
    allowedHours: boolean[][];
    isAllowed: (day: number, hour: number) => boolean;
} {
    const hours = new Array(7).fill(null).map(() => new Array(24).fill(false));
    
    // Парсим каждый бит
    for (let byteIndex = 0; byteIndex < 21; byteIndex++) {
        const byte = logonHoursBuffer[byteIndex];
        for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
            const globalBitIndex = byteIndex * 8 + bitIndex;
            const day = Math.floor(globalBitIndex / 24);
            const hour = globalBitIndex % 24;
            
            if (day < 7 && hour < 24) {
                hours[day][hour] = (byte & (1 << bitIndex)) !== 0;
            }
        }
    }
    
    return {
        allowedHours: hours,
        isAllowed: (day: number, hour: number) => hours[day]?.[hour] || false
    };
}
```

### 2. Генерация logonHours для конкретного расписания

```typescript
private generateLogonHoursBuffer(schedule: {
    monday?: { start: number; end: number };
    tuesday?: { start: number; end: number };
    wednesday?: { start: number; end: number };
    thursday?: { start: number; end: number };
    friday?: { start: number; end: number };
    saturday?: { start: number; end: number };
    sunday?: { start: number; end: number };
}): Buffer {
    const hours = new Array(168).fill(0);
    
    const dayMap = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
    };
    
    Object.entries(schedule).forEach(([day, time]) => {
        if (time && dayMap[day] !== undefined) {
            const dayIndex = dayMap[day];
            for (let hour = time.start; hour < time.end; hour++) {
                const bitIndex = dayIndex * 24 + hour;
                if (bitIndex < 168) {
                    hours[bitIndex] = 1;
                }
            }
        }
    });
    
    // Преобразуем в Buffer
    const bytes: number[] = [];
    for (let i = 0; i < 21; i++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
            if (hours[i * 8 + bit]) {
                byte |= 1 << bit;
            }
        }
        bytes.push(byte);
    }
    
    return Buffer.from(bytes);
}
```

### 3. Утилиты для работы с logonHours

```typescript
// Проверка, может ли пользователь войти сейчас
isUserAllowedToLoginNow(logonHoursBuffer: Buffer): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = воскресенье
    const hour = now.getHours();
    
    const { isAllowed } = this.parseLogonHours(logonHoursBuffer);
    return isAllowed(day, hour);
}

// Получение человекочитаемого расписания
getHumanReadableSchedule(logonHoursBuffer: Buffer): string {
    const { allowedHours } = this.parseLogonHours(logonHoursBuffer);
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    
    return allowedHours.map((dayHours, dayIndex) => {
        const allowedRanges = this.getTimeRanges(dayHours);
        return `${days[dayIndex]}: ${allowedRanges.join(', ') || 'запрещено'}`;
    }).join('\n');
}

private getTimeRanges(hours: boolean[]): string[] {
    const ranges: string[] = [];
    let start: number | null = null;
    
    for (let i = 0; i < 24; i++) {
        if (hours[i] && start === null) {
            start = i;
        } else if (!hours[i] && start !== null) {
            ranges.push(`${start}:00-${i}:00`);
            start = null;
        }
    }
    
    if (start !== null) {
        ranges.push(`${start}:00-24:00`);
    }
    
    return ranges;
}
```

### 4. Установка logonHours для пользователя

```typescript
async setUserLogonHours(userDn: string, schedule: any): Promise<boolean> {
    const client = await this.createAndBindLdapClient();
    try {
        const logonHoursBuffer = this.generateLogonHoursBuffer(schedule);
        
        return new Promise((resolve, reject) => {
            const change = new ldap.Change({
                operation: 'replace',
                modification: new ldap.Attribute({
                    type: 'logonHours',
                    values: [logonHoursBuffer]
                })
            });
            
            client.modify(userDn, change, (err) => {
                if (err) {
                    this.logger.error(`Ошибка при установке logonHours: ${err.message}`);
                    reject(new ConflictException(`Ошибка при установке logonHours: ${err.message}`));
                } else {
                    this.logger.info(`logonHours успешно установлен для ${userDn}`);
                    resolve(true);
                }
            });
        });
    } finally {
        client.unbind();
    }
}
```

## Примеры расписаний

### Стандартное рабочее время (9:00-18:00, Пн-Пт)

```typescript
const standardWorkSchedule = {
    monday: { start: 9, end: 18 },
    tuesday: { start: 9, end: 18 },
    wednesday: { start: 9, end: 18 },
    thursday: { start: 9, end: 18 },
    friday: { start: 9, end: 18 }
};
```

### Круглосуточный доступ

```typescript
const fullAccessSchedule = {
    sunday: { start: 0, end: 24 },
    monday: { start: 0, end: 24 },
    tuesday: { start: 0, end: 24 },
    wednesday: { start: 0, end: 24 },
    thursday: { start: 0, end: 24 },
    friday: { start: 0, end: 24 },
    saturday: { start: 0, end: 24 }
};
```

### Ночная смена (22:00-06:00)

```typescript
const nightShiftSchedule = {
    sunday: { start: 22, end: 24 },
    monday: { start: 0, end: 6 },
    tuesday: { start: 0, end: 6 },
    wednesday: { start: 0, end: 6 },
    thursday: { start: 0, end: 6 },
    friday: { start: 0, end: 6 },
    saturday: { start: 0, end: 6 }
};
```

## Интеграция в LdapService

Для интеграции этих методов в ваш `LdapService`, добавьте их как приватные методы и создайте публичные методы для внешнего использования:

```typescript
// Публичные методы для использования в других сервисах
async getUserLogonHours(userDn: string): Promise<Buffer | null> {
    // Реализация получения logonHours пользователя
}

async updateUserLogonHours(userDn: string, schedule: any): Promise<boolean> {
    // Реализация обновления logonHours
}

async isUserCurrentlyAllowed(userDn: string): Promise<boolean> {
    // Реализация проверки текущего доступа
}
```

## Примечания

1. **Временные зоны**: Учитывайте, что logonHours работает по времени сервера Active Directory
2. **Кэширование**: Результаты могут кэшироваться, изменения могут вступить в силу не сразу
3. **Права доступа**: Убедитесь, что у сервиса есть права на изменение атрибута logonHours
4. **Тестирование**: Всегда тестируйте изменения на тестовых пользователях перед применением к продакшену
