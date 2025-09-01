import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OneTimeCreateInput } from './inputs/create.input';
import { Logger } from 'winston';
import { OneTimeUpdateInput } from './inputs/update.input';
import { FieldSortInput } from 'src/common/inputs/field-type/sort.input';
import { OneTimeFilterInput } from './inputs/filter.input';
import { OneTimeGetModel } from './models/get.model';
import { OneTime } from '@prisma/client';


@Injectable()
export class OnetimeService {
    constructor(
        private readonly prismaService: PrismaService,
        @Inject('winston') private readonly logger: Logger
    ) {}

    // проверка на дубликаты перед добавлением записи
    async checkDuplicate(login: string, date: Date) {
        // Сравниваем по календарному дню (локальная TZ)
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nextDay = new Date(dayStart);
        nextDay.setDate(nextDay.getDate() + 1);

        const duplicateOneTime: OneTime | null = await this.prismaService.oneTime.findFirst({
            where: {
                login,
                date: {
                    gte: dayStart,
                    lt: nextDay
                }
            }
        })

        return duplicateOneTime;
    }

    // поиск по айди
    async findById(id: string): Promise<OneTime> {
        const findedOneTime: OneTime = await this.prismaService.oneTime.findUniqueOrThrow({
            where: {
                id
            }
        })
        return findedOneTime;
    }

    // добавление новой разовой задачи
    async create(input: OneTimeCreateInput, authUsername: string):Promise<boolean> {
        const findedOneTime: OneTime | null = await this.checkDuplicate(input.login, input.date)

        if (findedOneTime) {
            this.logger.error(`Запись разовой задачи уже существует: ${input.login} - ${input.date} пользователем ${authUsername})`);
            throw new ConflictException('Запись разовой задачи уже существует')
        }

        const createdOneTime = await this.prismaService.oneTime.create({
            data: {
                ...input,
                createdBy: authUsername,
                updatedBy: authUsername
            }
        })
        
        this.logger.info(`Запись разовой задачи создана: ${createdOneTime.fio} пользователем ${authUsername}`);

        return true;
    }

    // удаление разовой записи
    async delete(id: string, authUsername: string):Promise<boolean> {
        await this.findById(id)

        const deletedOneTime = await this.prismaService.oneTime.delete({
            where: {
                id
            }
        })

        this.logger.info(`Запись расписания удалена: ${deletedOneTime.fio}-${deletedOneTime.date} пользователем ${authUsername}`);

        return true
    }

    // изменение разовой задачи
    async update(id: string, input: OneTimeUpdateInput, authUsername: string):Promise<boolean> {
        await this.findById(id)
        const data = {
            ...input,
            updatedBy: authUsername
        }
        const updatedOneTime = await this.prismaService.oneTime.update({
            where: {
                id
            },
            data
        })

        this.logger.info(`Запись разовой задачи изменена ${updatedOneTime.fio} пользователем ${authUsername}`);

        return true;
    }

    // получение списка разовых задач с надстройками
    async getOneTimes(options?: {
        filter?: OneTimeFilterInput;
        sort?: FieldSortInput;
        skip?: number;
        take?: number;
    }):Promise<OneTimeGetModel[]>{
        const { filter, sort, skip, take } = options || {};
        const oneTimes: OneTimeGetModel[] = await this.prismaService.oneTime.findMany({
            where: filter,
            orderBy: sort ? { [sort.field]: sort.order || 'asc' } : undefined,
            skip,
            take
        })

        this.logger.info(`Получение списка разовых задач`);

        return oneTimes
    }

    /**
     * Переносит разовую задачу в архив и удаляет её из основной таблицы.
     * Операция выполняется в транзакции: если задача не найдена — возвращает false.
     * В случае успеха возвращает true, иначе логирует ошибку и возвращает false.
     * @param id - идентификатор разовой задачи
     */
    async toArchive(id: string):Promise<boolean> {
        try {
            // Транзакция: найти задачу, скопировать в архив, удалить из основной таблицы
            const isCompleate = await this.prismaService.$transaction(async (tx) => {
                // Поиск разовой задачи по id
                const oneTime = await tx.oneTime.findUnique({
                    where: { id }
                });

                // Если задача не найдена — выход
                if (!oneTime) {
                    this.logger.warn(`Разовая задача при попытке архивирования не найдена: ${id}`, { label: 'cron' });
                    return false;
                }

                // Копирование задачи в архивную таблицу
                await tx.archiveOneTime.create({
                    data: { 
                        id: oneTime.id,
                        fio: oneTime.fio,
                        login: oneTime.login,
                        state: oneTime.state,
                        date: oneTime.date,
                        isCompleate: true,
                        description: oneTime.description,
                        createdAt: oneTime.createdAt,
                        updatedAt: oneTime.updatedAt,
                        createdBy: oneTime.createdBy,
                        updatedBy: oneTime.updatedBy
                    }
                });

                // Удаление задачи из основной таблицы
                await tx.oneTime.delete({
                    where: { id: oneTime.id }
                });

                return true;
            });

            // Логирование успешного архивирования
            this.logger.info(`Архивирование и обновление выполнено (Разовая): ${id}`, { label: 'cron' });

            return isCompleate;
        } catch (err) {
            // Логирование ошибки при архивировании
            this.logger.error(
                `Ошибка при архивировании/обновлении в БД (Разовая) (${id}) — ${err.message}`,
                { label: 'cron' }
            );
            return false;
        }
    }

    // получение списка разовых задач в архиве с надстройками
    async getArchiveOneTimes(options?: {
        filter?: OneTimeFilterInput;
        sort?: FieldSortInput;
        skip?: number;
        take?: number;
    }):Promise<OneTimeGetModel[]>{
        const { filter, sort, skip, take } = options || {};
        const oneTimes: OneTimeGetModel[] = await this.prismaService.archiveOneTime.findMany({
            where: filter,
            orderBy: sort ? { [sort.field]: sort.order || 'asc' } : undefined,
            skip,
            take
        })

        this.logger.info(`Получение списка разовых задач в архиве`);

        return oneTimes;
    }
}
