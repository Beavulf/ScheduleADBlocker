import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Logger } from 'winston';
import { RecallCreateInput } from './inputs/create.input';
import { RecallUpdateInput } from './inputs/update.input';
import { RecallFilterInput } from './inputs/filter.input';
import { FieldSortInput } from 'src/common/inputs/field-type/sort.input';
import { RecallGetModel } from './models/get.model';

@Injectable()
export class RecallService {
    constructor(
        private readonly prismaService: PrismaService,
        @Inject('winston') private readonly logger: Logger
    ) {}

    // проверка на наличее уже существубщего отзыва на запись расписания
    /**
     * Проверяет, существует ли уже отзыв для указанной записи расписания с данным order.
     * Возвращает найденный отзыв или null, если дубликата нет.
     * В случае ошибки выбрасывает InternalServerErrorException.
     * @param idSchedule - идентификатор записи расписания
     * @param order - порядковый номер отзыва
     */
    async checkDuplicateRecall(idSchedule: string, order: string) {
        try {
            const existingRecall = await this.prismaService.recall.findFirst({
                where: {
                    schedule: { id: idSchedule },
                    order
                }
            });

            return existingRecall;
        } catch (err) {
            this.logger.error(`Ошибка при поиске дубликата отзыва: ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.message}`);
        }
    }

    // добавление отзыва
    /**
     * Создаёт новый отзыв для указанной записи расписания.
     * Проверяет на дублирование по order и idSchedule.
     * В случае дубликата выбрасывает ConflictException.
     * В случае успеха возвращает true, иначе выбрасывает InternalServerErrorException.
     * @param input - данные для создания отзыва
     * @param idSchedule - идентификатор записи расписания
     * @param authUsername - имя пользователя, создавшего отзыв
     */
    async create(input: RecallCreateInput, idSchedule: string, authUsername: string): Promise<boolean> {
        // Проверяем, существует ли уже отзыв на эту запись расписания с таким order
        const findedRecall = await this.checkDuplicateRecall(idSchedule, input.order);

        if (findedRecall) {
            this.logger.error(`Отзыв на эту запись уже существует: (${input.order}, ${idSchedule}) пользователем ${authUsername}`);
            throw new ConflictException('Отзыв на эту запись уже существует');
        }

        // Создаём новый отзыв и обновляем флаг isRecall в расписании в рамках транзакции
        const [createdRecall] = await this.prismaService.$transaction([
            this.prismaService.recall.create({
                data: {
                    ...input,
                    createdBy: authUsername,
                    updatedBy: authUsername,
                    schedule: {
                        connect: {
                            id: idSchedule,
                        },
                    },
                },
                include: {
                    schedule: true,
                },
            }),
            this.prismaService.schedule.update({
                where: { id: idSchedule },
                data: { isRecall: true },
            }),
        ]);

        this.logger.info(`Запись отзыва создана: ID ${idSchedule} - ${createdRecall.order} пользователем ${authUsername}`);
        return true;
    }

    /**
     * Находит отзыв по его идентификатору.
     * Если отзыв не найден — выбрасывает исключение NotFoundException.
     * @param id - идентификатор отзыва
     * @returns найденный отзыв с данными расписания
     */
    async findById(id: string) {
        const findedRecall = await this.prismaService.recall.findUniqueOrThrow({
            where: { id },
            include: { schedule: true }
        });
        return findedRecall;
    }

    // удаление отзыва
    /**
     * Удаляет отзыв по его идентификатору.
     * Если отзыв не найден — выбрасывает исключение.
     * В случае успеха возвращает true, иначе логирует ошибку и выбрасывает InternalServerErrorException.
     * @param id - идентификатор отзыва
     * @param authUsername - имя пользователя, выполняющего удаление
     */
    async delete(id: string, authUsername: string):Promise<boolean> {
        // Проверяем, существует ли отзыв с таким id
        await this.findById(id);

        // Удаляем отзыв из базы данных
        const deletedRecall = await this.prismaService.recall.delete({
            where: { id },
            include: { schedule: true }
        });

        this.logger.info(
            `Запись об отзыве удалена: ${deletedRecall.schedule.fio} - ${deletedRecall.order} пользователем ${authUsername}`
        );
        return true;
    }
    
    // изменение отзыва
    /**
     * Обновляет отзыв по его идентификатору.
     * Если отзыв не найден — выбрасывает исключение.
     * В случае успеха возвращает true, иначе логирует ошибку и выбрасывает InternalServerErrorException.
     * @param id - идентификатор отзыва
     * @param input - данные для обновления отзыва
     * @param authUsername - имя пользователя, выполняющего обновление
     */
    async update(id: string, input: RecallUpdateInput, authUsername: string):Promise<boolean> {
        // Проверяем, существует ли отзыв с таким id
        await this.findById(id);
        const data = {
            ...input,
            updatedBy: authUsername
        };

        // Обновляем отзыв в базе данных
        const updatedRecall = await this.prismaService.recall.update({
            where: { id },
            data,
            include: { schedule: true }
        });

        this.logger.info(`Запись об отзыве изменена - ${updatedRecall.order} пользователем ${authUsername}`);
        return true;
    }

    /**
     * Получает список отзывов с возможностью фильтрации, сортировки, пагинации.
     * 
     * @param options.filter - фильтр для поиска отзывов
     * @param options.sort - сортировка результатов
     * @param options.skip - сколько записей пропустить (offset)
     * @param options.take - сколько записей взять (limit)
     * @returns массив отзывов с включённым расписанием
     */
    async getRecalls(options?: {
        filter?: RecallFilterInput;
        sort?: FieldSortInput;
        skip?: number;
        take?: number;
    }): Promise<RecallGetModel[]> {
        const { filter, sort, skip, take } = options || {};
        const recalls: RecallGetModel[] = await this.prismaService.recall.findMany({
            where: filter,
            orderBy: sort ? { [sort.field]: sort.order || 'asc' } : undefined,
            skip,
            take,
            include: {
                schedule: true
            }
        });

        this.logger.info(`Получение списка отзывов`);
        return recalls;
    }

    /**
     * Получает список отзывов по ФИО сотрудника (и опционально по статусу).
     * 
     * @param fio - ФИО сотрудника для поиска связанных отзывов
     * @param status - (необязательно) статус отзыва (true/false)
     * @returns массив отзывов, соответствующих критериям поиска
     */
    async getRecallsByFio(fio: string, status?: boolean) {
        const recalls = await this.prismaService.recall.findMany({
            where: {
                status,
                schedule: {
                    fio
                }
            },
        });

        this.logger.info(`Получение списка отзывов по ФИО - ${fio}`);
        return recalls;
    }


    /**
     * Архивирует отзыв (recall) и обновляет связанное расписание в одной транзакции (атомарно).
     * 
     * 1. Находит отзыв по id (включая связанное расписание).
     * 2. Переносит отзыв в архив (archiveRecall).
     * 3. Удаляет исходный отзыв.
     * 4. Снимает флаг isRecall у связанного расписания.
     * 
     * @param id - идентификатор отзыва для архивирования
     * @returns true, если архивирование прошло успешно, иначе false
     */
    async toArchive(id: string) {
        try {
            const isCompleate = await this.prismaService.$transaction(async (tx) => {
                // Получаем отзыв по id, включая связанное расписание
                const recall = await tx.recall.findUnique({
                    where: { id },
                    include: { schedule: true }
                });

                if (!recall) {
                    // Если отзыв не найден — возвращаем false
                    this.logger.warn(`Отзыв не найден при попытке архивирования: ${id}`)
                    return false;
                }

                // 1. Архивируем текущий recall
                await tx.archiveRecall.create({
                    data: {
                        id: id,
                        order: recall.order,
                        startDate: recall.startDate,
                        endDate: recall.endDate,
                        description: recall.description,
                        status: false, // Архивный отзыв всегда неактивен
                        scheduleId: recall.scheduleId,
                        createdAt: recall.createdAt,
                        updatedAt: recall.updatedAt,
                        createdBy: recall.createdBy,
                        updatedBy: recall.updatedBy
                    }
                });

                // 2. Удаляем исходный recall
                await tx.recall.delete({
                    where: { id: recall.id }
                });

                // 3. Снимаем флаг isRecall у связанного расписания
                await tx.schedule.update({
                    where: { id: recall.scheduleId },
                    data: { isRecall: false, updatedBy: 'system' }
                });

                // Логируем успешное завершение транзакции
                this.logger.info(
                    `Архивирование и обновление выполнено (Отзыв): recallId=${id}, scheduleId=${recall.scheduleId}`,
                    { label: 'cron' }
                );
                return true;
            });

            return isCompleate;
        } catch (error) {
            // Логируем ошибку при архивировании/обновлении
            this.logger.error(
                `Ошибка при архивировании/обновлении в БД (Отзыв): recallId=${id} — ${error.message}`,
                { label: 'cron' }
            );
            return false;
        }
    }

    /**
     * Получает список отзывов из АРХИВА с возможностью фильтрации, сортировки, пагинации.
     * 
     * @param options.filter - фильтр для поиска отзывов
     * @param options.sort - сортировка результатов
     * @param options.skip - сколько записей пропустить (offset)
     * @param options.take - сколько записей взять (limit)
     * @returns массив отзывов с включённым расписанием
     */
    async getArchiveRecalls(options?: {
        filter?: RecallFilterInput;
        sort?: FieldSortInput;
        skip?: number;
        take?: number;
    }): Promise<RecallGetModel[]> {
        const { filter, sort, skip, take } = options || {};
        const recalls: RecallGetModel[] = await this.prismaService.archiveRecall.findMany({
            where: filter,
            orderBy: sort ? { [sort.field]: sort.order || 'asc' } : undefined,
            skip,
            take,
        });

        this.logger.info(`Получение списка АРХИВНЫХ отзывов ${options?.filter}`);
        return recalls;
    }
}
