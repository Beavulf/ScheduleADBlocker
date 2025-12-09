import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScheduleFilterInput } from './inputs/filter.input';
import { FieldSortInput } from '../common/inputs/field-type/sort.input';
import { ScheduleCreateInput } from './inputs/create.input';
import { Logger } from 'winston';
import { ScheduleModel } from './models/schedule.model';
import { ScheduleUpdateInput } from './inputs/update.input';
import { LdapService } from 'src/ldap/ldap.service';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject('winston') private readonly logger: Logger,
    private readonly ldapService: LdapService,
  ) {}

  // поулчение списка расписания
  async getSchedules(options?: {
    filter?: ScheduleFilterInput;
    sort?: FieldSortInput;
    skip?: number;
    take?: number;
  }): Promise<ScheduleModel[]> {
    const { filter, sort, skip, take } = options || {};
    const schedules: ScheduleModel[] =
      await this.prismaService.schedule.findMany({
        where: filter,
        orderBy: sort ? { [sort.field]: sort.order || 'asc' } : undefined,
        skip,
        take,
      });

    return schedules;
  }

  // поиск записи по айди
  async findById(id: string) {
    const schedule = await this.prismaService.schedule.findUnique({
      where: {
        id,
      },
    });

    if (!schedule) {
      this.logger.error(`Запись расписания не найдена: ${id}`);
      throw new NotFoundException('Запись расписания не найдена');
    }

    return schedule;
  }

  // поиск записи по трем параметрам
  private async checkDuplicateSchedule(
    order: string,
    startDate: Date,
    login: string,
  ) {
    try {
      const findedSchedule = await this.prismaService.schedule.findFirst({
        where: {
          order,
          startDate,
          login,
        },
      });

      return findedSchedule;
    } catch (err) {
      this.logger.error(
        `Ошибка при поиске дубликата записи расписания: ${err.message}`,
      );
      throw new InternalServerErrorException(
        `Ошибка при работе с БД - ${err.code}`,
      );
    }
  }

  // создание записи в расписании
  async create(
    input: ScheduleCreateInput,
    authUsername: string,
  ): Promise<boolean> {
    const findedSchedule = await this.checkDuplicateSchedule(
      input.order,
      input.startDate,
      input.login,
    );

    if (findedSchedule) {
      this.logger.error(
        `Запись расписания с такими параметрами (приказ, дата начала, логин) уже существует: (${input.order}, ${input.startDate.toISOString()}, ${input.login}) пользователем ${authUsername})`,
      );
      throw new ConflictException('Запись расписания уже существует');
    }

    try {
      const newSchedule = await this.prismaService.schedule.create({
        data: {
          ...input,
          createdBy: authUsername,
          updatedBy: authUsername,
        },
      });

      this.logger.info(
        `Запись расписания создана: ${newSchedule.fio}-${newSchedule.order} пользователем ${authUsername}`,
      );

      return true;
    } catch (err) {
      this.logger.error(
        `Ошибка при работе с БД (создание записи расписания): ${err.message} пользователем ${authUsername}`,
      );
      throw new InternalServerErrorException(
        `Ошибка при работе с БД - ${err.code}`,
      );
    }
  }

  // удаление записи расписания
  async delete(id: string, authUsername: string): Promise<boolean> {
    await this.findById(id);

    try {
      const deletedSchedule = await this.prismaService.schedule.delete({
        where: {
          id,
        },
      });

      this.logger.info(
        `Запись расписания удалена: ${deletedSchedule.fio}-${deletedSchedule.order} пользователем ${authUsername}`,
      );

      return true;
    } catch (err) {
      this.logger.error(
        `Ошибка при работе с БД (удаление записи расписания): ${err.message}`,
      );
      throw new InternalServerErrorException(
        `Ошибка при работе с БД - ${err.code}`,
      );
    }
  }

  // изменение записи
  async update(
    id: string,
    input: ScheduleUpdateInput,
    authUsername: string,
  ): Promise<boolean> {
    await this.findById(id);
    const data = {
      ...input,
      updatedBy: authUsername,
    };
    try {
      const updatedSchedule = await this.prismaService.schedule.update({
        where: {
          id,
        },
        data,
      });

      this.logger.info(
        `Запись расписания изменена: ${updatedSchedule.fio}-${updatedSchedule.order} пользователем ${authUsername}`,
      );

      return true;
    } catch (err) {
      this.logger.error(
        `Ошибка при работе с БД (изменение записи расписания): ${err.message}`,
      );
      throw new InternalServerErrorException(
        `Ошибка при работе с БД - ${err.code}`,
      );
    }
  }

  // отправка задачи в архив, если есть отзыв он тоже идет в архив
  /**
   * Архивирует запись расписания и, при необходимости, связанный отзыв.
   *
   * Операция выполняется в транзакции:
   * 1. Находит запись расписания по id (включая отзыв, если есть).
   * 2. Если отзыв присутствует и требуется архивировать (recallToArchive === true), переносит отзыв в архив.
   * 3. Переносит саму запись расписания в архив.
   * 4. Удаляет исходную запись расписания (и отзыв, если был).
   *
   * @param id - идентификатор записи расписания для архивирования
   * @param shouldArchiveRecall - если true, архивирует также связанный отзыв (если он есть)
   * @returns true, если архивирование прошло успешно, иначе false
   */
  async toArchive(
    id: string,
    shouldArchiveRecall: boolean = true,
  ): Promise<boolean> {
    try {
      const isCompleate = await this.prismaService.$transaction(async (tx) => {
        // Получаем запись расписания с потенциальным отзывом
        const schedule = await tx.schedule.findUnique({
          where: { id },
          include: { recall: true },
        });

        if (!schedule) {
          return false;
        }

        if (schedule.recall && shouldArchiveRecall) {
          // Архивируем отзыв
          await tx.archiveRecall.create({
            data: {
              id: schedule.recall.id,
              order: schedule.recall.order,
              startDate: schedule.recall.startDate,
              endDate: schedule.recall.endDate,
              description: schedule.recall.description,
              status: schedule.recall.status,
              scheduleId: schedule.recall.scheduleId,
              createdAt: schedule.recall.createdAt,
              updatedAt: schedule.recall.updatedAt,
              createdBy: schedule.recall.createdBy,
              updatedBy: schedule.recall.updatedBy,
            },
          });
          this.logger.info(
            `Найденный отзыв задачи был отправлен в архив: задача - ${id}, отзыв - ${schedule.recall.id}`,
            { label: 'cron' },
          );
        }

        // Архивируем саму задачу
        await tx.archiveSchedule.create({
          data: {
            id: schedule.id,
            fio: schedule.fio,
            login: schedule.login,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            order: schedule.order,
            status: schedule.status,
            isRecall: schedule.isRecall,
            type: schedule.type,
            description: schedule.description,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
            createdBy: schedule.createdBy,
            updatedBy: schedule.updatedBy,
          },
        });

        // Удаляем исходную задачу (и отзыв, если был)
        await tx.schedule.delete({
          where: { id },
        });
        return true;
      });

      this.logger.info(`Архивирование и обновление выполнено: ${id}`, {
        label: 'cron',
      });
      return isCompleate;
    } catch (err) {
      this.logger.error(
        `Ошибка при обновлении статусов и архивации записи в БД (${id}) — ${err.message}`,
        { label: 'cron' },
      );
      return false;
    }
  }

  // поулчение списка АРХИВНОГО расписания
  async getArchiveSchedules(options?: {
    filter?: ScheduleFilterInput;
    sort?: FieldSortInput;
    skip?: number;
    take?: number;
  }): Promise<ScheduleModel[]> {
    const { filter, sort, skip, take } = options || {};
    const schedules: ScheduleModel[] =
      await this.prismaService.archiveSchedule.findMany({
        where: filter,
        orderBy: sort ? { [sort.field]: sort.order || 'asc' } : undefined,
        skip,
        take,
      });

    return schedules;
  }
}
