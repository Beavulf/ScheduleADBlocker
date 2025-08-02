import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file'; // важно для типов и работы транспорта

export async function asyncWinstonConfig(configService: ConfigService) {
  return {
    transports: [
      new winston.transports.DailyRotateFile({
        filename: configService.getOrThrow('LOGGER_PATH') + '%DATE%.log',
        datePattern: 'YYYY-MM-DD', // или 'YYYY-ww' для недель
        zippedArchive: true, // архивировать старые логи
        maxSize: '20m', // максимальный размер одного файла
        maxFiles: '14d', // хранить 14 дней, можно '7d', '30d', '2w' и т.д.
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  };
}