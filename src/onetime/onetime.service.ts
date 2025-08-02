import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OneTimeCreateInput } from './inputs/create.input';
import { Logger } from 'winston';
import { OneTimeUpdateInput } from './inputs/update.input';
import { FieldSortInput } from 'src/common/inputs/field-type/sort.input';
import { OneTimeFilterInput } from './inputs/filter.input';
import { OneTimeGetModel } from './models/get.model';


@Injectable()
export class OnetimeService {
    constructor(
        private readonly prismaService: PrismaService,
        @Inject('winston') private readonly logger: Logger
    ) {}

    // проверка на дубликаты перед добавлением записи
    async checkDuplicate(login: string, date: Date) {
        try {
            const findedOneTime = await this.prismaService.oneTime.findFirst({
                where: {
                    login,
                    date
                }
            })
    
            return findedOneTime
        }
        catch(err) {
            this.logger.error(`Ошибка при поиске дубликата разовой задачи: ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.message}`)
        }
    }

    // поиск по айди
    async findById(id: string) {
        const findedOneTime = await this.prismaService.oneTime.findUnique({
            where: {
                id
            }
        })

        if (!findedOneTime) {
            throw new NotFoundException('Запись разовой задачи не найдена')
        }

        return findedOneTime
    }

    // добавление новой разовой задачи
    async create(input: OneTimeCreateInput, authUsername: string):Promise<boolean> {
        const findedOneTime = await this.checkDuplicate(input.login, input.date)

        if (findedOneTime) {
            this.logger.error(`Запись разовой задачи уже существует: ${input.login} - ${input.date} пользователем ${authUsername})`);
            throw new ConflictException('Запись разовой задачи уже существует')
        }

        try {
            const createdOneTime = await this.prismaService.oneTime.create({
                data: {
                    ...input,
                    createdBy: authUsername,
                    updatedBy: authUsername
                }
            })
            
            this.logger.info(`Запись разовой задачи создана: ${createdOneTime.fio} пользователем ${authUsername}`);

            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (создание разовой задачи): ${err.message} пользователем ${authUsername}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    // удаление разовой записи
    async delete(id: string, authUsername: string):Promise<boolean> {
        const findedOneTime = await this.findById(id)

        try {
            const deletedOneTime = await this.prismaService.oneTime.delete({
                where: {
                    id
                }
            })

            this.logger.info(`Запись расписания удалена: ${deletedOneTime.fio}-${deletedOneTime.date} пользователем ${authUsername}`);

            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (удаление разовой задачи): ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    // изменение разовой задачи
    async update(id: string, input: OneTimeUpdateInput, authUsername: string):Promise<boolean> {
        const findedOneTime = await this.findById(id)
        const data = {
            ...input,
            updatedBy: authUsername
        }
        try {
            const updatedOneTime = await this.prismaService.oneTime.update({
                where: {
                    id
                },
                data
            })

            this.logger.info(`Запись разовой задачи изменена`);

            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (изменение разовой задачи): ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
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
}
