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
    async checkDuplicateRecall(idSchedule: string, order: string) {
        try {
            const findedRecall = await this.prismaService.recall.findFirst({
                where: {
                    schedule: {id: idSchedule},
                    order
                }
            })
    
            return findedRecall
        }
        catch(err) {
            this.logger.error(`Ошибка при поиске дубликата отзыва: ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.message}`)
        }
    }

    // добавление отзыва
    async create(input: RecallCreateInput, idSchedule: string, authUsername: string):Promise<boolean> {
        const findedRecall = await this.checkDuplicateRecall(idSchedule, input.order)

        if (findedRecall) {
            this.logger.error(`Отзыв на эту запись уже существует: (${input.order}, ${idSchedule}) пользователем ${authUsername})`);
            throw new ConflictException('Отзыв на эту запись уже существует')
        }

        try {
            const createdReacll = await this.prismaService.recall.create({
                data: {
                    ...input,
                    createdBy: authUsername,
                    updatedBy: authUsername,
                    schedule: {
                        connect: {
                            id: idSchedule
                        }
                    }
                },
                include: {
                    schedule: true
                }
            })
            
            this.logger.info(`Запись расписания создана: ID ${idSchedule} - ${createdReacll.order} пользователем ${authUsername}`);

            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (создание записи расписания): ${err.message} пользователем ${authUsername}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    async findById(id: string) {
        const findedRecall = await this.prismaService.recall.findUnique({
            where: {
                id
            }
        })

        if (!findedRecall) {
            this.logger.warn(`Запись расписания не найдена: ${id}`);
            throw new NotFoundException('Запись расписания не найдена')
        }

        return findedRecall
    }

    // удаление отзыва
    async delete(id:string, authUsername: string):Promise<boolean> {
        const findedRecall = await this.findById(id)

        try {
            const deletedRecall = await this.prismaService.recall.delete({
                where: {
                    id
                },
                include: {
                    schedule: true
                }
            })

            this.logger.info(`Запись об отзыве удалена: ${deletedRecall.schedule.fio} - ${deletedRecall.order} пользователем ${authUsername}`);

            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (удаление записи отзыва): ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }
    
    // изменение отзыва
    async update(id: string, input: RecallUpdateInput, authUsername: string):Promise<boolean> {
        const findedRecall = await this.findById(id)
        const data = {
            ...input,
            updatedBy: authUsername
        }
        try {
            const updatedRecall = await this.prismaService.recall.update({
                where: {
                    id
                },
                data,
                include: {
                    schedule: true
                }
            })

            this.logger.info(`Запись об отзыве изменена`);

            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (изменение записи отзыва): ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    async getRecalls(options?: {
        filter?: RecallFilterInput;
        sort?: FieldSortInput;
        skip?: number;
        take?: number;
    }):Promise<RecallGetModel[]>{
        const { filter, sort, skip, take } = options || {};
        const recalls: RecallGetModel[] = await this.prismaService.recall.findMany({
            where: filter,
            orderBy: sort,
            skip,
            take,
            include: {
                schedule: true
            }
        })

        this.logger.info(`Получение списка отзывов`);

        return recalls
    }

    // получение всех отзывов по ФИО
    async getRecallsByFio(fio: string, status? : boolean) {
        const recalls = await this.prismaService.recall.findMany({
            where: {
                status,
                schedule: {
                    fio
                }
            },

        })

        this.logger.info(`Получение списка отзывов по ФИО - ${fio}`);

        return recalls
    }
}
