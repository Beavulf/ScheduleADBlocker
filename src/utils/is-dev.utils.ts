import { ConfigService } from '@nestjs/config';

// проверка в каком режиме работает проект - Разработки или Продакшн
export function isDev(configService: ConfigService) {
  return configService.getOrThrow('NODE_ENV') === 'development';
}
