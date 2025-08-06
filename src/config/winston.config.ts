import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file'; // важно для типов и работы транспорта

export async function asyncWinstonConfig(configService: ConfigService) {
  return {
    transports: [
      // Основной лог-файл для всех логов
      new winston.transports.DailyRotateFile({
        filename: configService.getOrThrow('LOGGER_PATH') + '%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: winston.format.combine(
          winston.format((info) => {
            // Пропускаем все логи с label: 'cron'
            return info.label === 'cron' ? false : info;
          })(),
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      // Отдельный лог-файл только для крон-задач (label: 'cron')
      new winston.transports.DailyRotateFile({
        filename: configService.getOrThrow('LOGGER_CRON_PATH') + '%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: winston.format.combine(
          winston.format((info) => {
            // Пропускаем все логи, кроме label: 'cron'
            return info.label === 'cron' ? info : false;
          })(),
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  };
}