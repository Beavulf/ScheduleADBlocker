import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Logger } from 'winston';
import { PrismaService } from 'src/prisma/prisma.service';
import { LdapService } from 'src/ldap/ldap.service';
import { handleTaskToStart } from './cron-task/task-to-start';
import { handleTaskToEnd } from './cron-task/task-to-end';
import { handleTaskToStartRecall } from './cron-task/task-to-start-recall';
import { handleTaskToEndRecall } from './cron-task/task-to-end-recall';
import { handleTaskToOneTime } from './cron-task/task-to-onetime';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScheduleService } from './schedule.service';
import { CronTaskInfoModel } from './models/cron-task-info.model';
import { RecallService } from 'src/recall/recall.service';
import { OnetimeService } from 'src/onetime/onetime.service';

@Injectable()
export class ScheduleCronTaskService {
  constructor(
    @Inject('winston') private readonly logger: Logger,
    private readonly prismaService: PrismaService,
    private readonly ldapService: LdapService,
    private readonly scheduleService: ScheduleService,
    private readonly recallService: RecallService,
    private readonly onetimeService: OnetimeService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) { }
  // флаг для предотвращения одновременного исполнения оркестратора (анти-оверлап в одном инстансе)
  private isRunning = false;
  // счетчик пропущенных тиков, если предыдущий запуск ещё идёт
  private skippedTicksCount = 0;
  // отметка времени последнего warn, чтобы троттлить частоту предупреждений
  private lastSkipWarnAt = 0;

  /**
   * Выполняет подзадачу с ограничением по времени и изолированной обработкой ошибок.
   *
   * - Не даёт "уронить" весь цикл при ошибке одной задачи.
   * - Ограничивает максимальную длительность выполнения задачи (по умолчанию 20 секунд).
   * - Логирует успешное выполнение и ошибки с длительностью.
   *
   * @param taskName Название подзадачи (для логов)
   * @param taskFn   Асинхронная функция-подзадача
   * @param timeoutMs Максимальное время выполнения задачи в миллисекундах (по умолчанию 20000)
   */
  private async runTask(
    taskName: string,
    taskFn: () => Promise<void>,
    timeoutMs = 20000,
  ): Promise<void> {
    const startedAt = Date.now();
    try {
      await Promise.race([
        taskFn(),
        // Если задача не завершилась за timeoutMs — выбрасываем ошибку таймаута
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`Задача ${taskName} не выполнена за ${timeoutMs}мс`),
              ),
            timeoutMs,
          ),
        ),
      ]);
      this.logger.info(
        `Задача ${taskName} выполнена за ${Date.now() - startedAt}мс`,
        { label: 'cron', task: taskName },
      );
    } catch (error) {
      this.logger.error(
        `Ошибка в задаче ${taskName}: ${(error as Error)?.message}`,
        { label: 'cron', task: taskName, stack: (error as Error)?.stack },
      );
    }
  }

  /**
   * Основной cron-оркестратор для обработки расписания блокировок пользователей.
   * Запускается каждые 30 минут по московскому времени.
   * Название задачи: handleUserBlockingSchedule
   * Важно: не допускает одновременного выполнения (anti-overlap).
   */
  @Cron(CronExpression.EVERY_10_HOURS, {
    name: 'handleUserBlockingSchedule',
    timeZone: 'Europe/Moscow', // временная зона выполнения cron-задачи
  })
  async handleScheduledTasks() {
    const job = this.schedulerRegistry.getCronJob('handleUserBlockingSchedule');

    // если предыдущий запуск ещё выполняется — накапливаем пропуски, предупреждения троттлим раз в минуту
    if (this.isRunning) {
      this.skippedTicksCount += 1;
      const now = Date.now();
      if (now - this.lastSkipWarnAt > 60_000) {
        // не чаще раза в минуту
        this.logger.warn(
          `Предыдущий запуск ещё выполняется — пропущено тиков: ${this.skippedTicksCount}`,
          { label: 'cron', skipped: this.skippedTicksCount },
        );
        this.lastSkipWarnAt = now;
      }
      return;
    }
    this.isRunning = true;
    const start = Date.now();
    this.logger.info('Запуск задачи по обработке расписания блокировок...', {
      label: 'cron',
    });
    try {
      // если были пропуски, сообщаем агрегировано и сбрасываем счётчик
      if (this.skippedTicksCount > 0) {
        this.logger.info(
          `До запуска было пропущено тиков: ${this.skippedTicksCount}`,
          { label: 'cron', skipped: this.skippedTicksCount },
        );
        this.skippedTicksCount = 0;
      }

      await this.runTask('task-to-start-recall', () =>
        handleTaskToStartRecall.call(this),
      );
      await this.runTask('task-to-end-recall', () =>
        handleTaskToEndRecall.call(this),
      );
      await this.runTask('task-to-start', () => handleTaskToStart.call(this));
      await this.runTask('task-to-end', () => handleTaskToEnd.call(this));
      await this.runTask('task-to-onetime', () =>
        handleTaskToOneTime.call(this),
      );
      this.logger.info(`Все подзадачи завершены за ${Date.now() - start}мс`, {
        label: 'cron',
      });
    } finally {
      this.isRunning = false;
      this.logger.info(
        `Задача по обработке расписания блокировок завершена (${Date.now() - start}мс).`,
        { label: 'cron' },
      );
    }
    console.log(
      `${job.isActive} - END - ${job.nextDate().toISODate()} - ${job.cronTime.sendAt()}`,
    );
  }

  // получений всей информации о задачи расписания
  async getCronTaskInfo(taskName: string): Promise<CronTaskInfoModel> {
    const job = this.schedulerRegistry.getCronJob(taskName);
    if (!job) {
      throw new NotFoundException(`Задача ${taskName} не найдена`);
    }
    const info: CronTaskInfoModel = {
      isActive: job.isActive, //активан ли
      source: job.cronTime.source.toLocaleString(), //какое задано время
      sendAt: job.cronTime.sendAt().toLocaleString(), // когда след запуск (дата)
      getTimeout: job.cronTime.getTimeout().toLocaleString(), // через сколько миллисекунд
      nextDate: job.nextDate().toJSDate(), //дата и время след запуска
      lastDate: job.lastDate(), // когда был последний запуск
    };

    return info;
  }

  // разовый горячий запуск задачи
  async fireOnTick(taskName: string): Promise<boolean> {
    const job = this.schedulerRegistry.getCronJob(taskName);
    if (!job) throw new NotFoundException(`Задача ${taskName} не найдена`);
    try {
      job.fireOnTick();
    } catch (err) {
      this.logger.error(
        `Ошибка при попытке горячего выполнения в задаче ${taskName}: ${(err as Error)?.message}`,
        { label: 'cron' },
      );
      throw new InternalServerErrorException(
        `Ошибка при попытке горячего запуска задачи ${taskName}: ${(err as Error)?.message}`,
      );
    }
    return true;
  }

  // остановка задачи
  async stopTask(taskName: string): Promise<boolean> {
    const job = this.schedulerRegistry.getCronJob(taskName);
    if (!job) throw new NotFoundException(`Задача ${taskName} не найдена`);
    try {
      job.stop();
    } catch (err) {
      this.logger.error(
        `Ошибка при попытке остановки задачи ${taskName}: ${(err as Error)?.message}`,
        { label: 'cron' },
      );
      throw new InternalServerErrorException(
        `Ошибка при попытке остановки задачи ${taskName}: ${(err as Error)?.message}`,
      );
    }
    return true;
  }

  // запуск задачи
  async startTask(taskName: string): Promise<boolean> {
    const job = this.schedulerRegistry.getCronJob(taskName);
    if (!job) throw new NotFoundException(`Задача ${taskName} не найдена`);
    try {
      job.start();
    } catch (err) {
      this.logger.error(
        `Ошибка при попытке запуска задачи ${taskName}: ${(err as Error)?.message}`,
        { label: 'cron' },
      );
      throw new InternalServerErrorException(
        `Ошибка при попытке запуска задачи ${taskName}: ${(err as Error)?.message}`,
      );
    }
    return true;
  }

  /**
   * Изменение расписания cron задачи
   * @param taskName Название задачи для изменения
   * @param cronExpression Новое cron выражение (например, '0 * / 15 * * * *')
   * @param timeZone Временная зона (по умолчанию 'Europe/Moscow')
   * @returns Promise<boolean> Успешность изменения
   */
  async updateCronTask(
    taskName: string,
    cronExpression: string,
    timeZone: string = 'Europe/Moscow',
  ): Promise<boolean> {
    const job = this.schedulerRegistry.getCronJob(taskName);
    if (!job) {
      throw new NotFoundException(`Задача ${taskName} не найдена`);
    }

    try {
      // Валидация cron выражения
      if (!this.isValidCronExpression(cronExpression)) {
        throw new Error(`Неверный формат cron выражения: ${cronExpression}`);
      }

      // Останавливаем задачу перед изменением
      const wasActive = job.isActive;
      if (wasActive) {
        job.stop();
      }

      // Обновляем расписание - используем правильный API для NestJS Schedule
      // В NestJS Schedule нужно использовать cronTime.setTime()
      // Используем require для избежания конфликта версий
      const { CronTime } = require('@nestjs/schedule/node_modules/cron');
      const newCronTime = new CronTime(cronExpression, timeZone);
      job.setTime(newCronTime);

      // Перезапускаем задачу, если она была активна
      if (wasActive) {
        job.start();
      }

      this.logger.info(
        `Расписание задачи ${taskName} изменено на: ${cronExpression} (${timeZone})`,
        { label: 'cron', task: taskName, cronExpression, timeZone },
      );

      return true;
    } catch (err) {
      this.logger.error(
        `Ошибка при изменении расписания задачи ${taskName}: ${(err as Error)?.message}`,
        { label: 'cron', task: taskName, cronExpression, timeZone },
      );
      throw new InternalServerErrorException(
        `Ошибка при изменении расписания задачи ${taskName}: ${(err as Error)?.message}`,
      );
    }
  }

  /**
   * Валидация cron выражения
   * @param cronExpression Cron выражение для проверки
   * @returns boolean Валидность выражения
   */
  private isValidCronExpression(cronExpression: string): boolean {
    try {
      // Простая валидация: проверяем, что выражение содержит 5-6 полей
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length < 5 || parts.length > 6) {
        return false;
      }

      // Проверяем, что все части содержат допустимые символы
      const validChars = /^[\d*/,\-\?LW#]+$/;
      return parts.every((part) => validChars.test(part));
    } catch {
      return false;
    }
  }
}
