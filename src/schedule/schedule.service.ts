import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
        private readonly ldapService: LdapService, // Предполагаем, что у вас есть такой сервис

    ) {}

    async getSchedules(options?: {
        filter?: ScheduleFilterInput;
        sort?: FieldSortInput;
        skip?: number;
        take?: number;
    }):Promise<ScheduleModel[]> {
        const { filter, sort, skip, take } = options || {};
        const schedules: ScheduleModel[] = await this.prismaService.schedule.findMany({
            where: filter,
            orderBy: sort,
            skip,
            take,
        })

        return schedules
    }

    // поиск записи по айди
    async findById(id: string) {
        const schedule = await this.prismaService.schedule.findUnique({
            where: {
                id
            }
        })

        if (!schedule) {
            this.logger.error(`Запись расписания не найдена: ${id}`)
            throw new NotFoundException('Запись расписания не найдена')
        }

        return schedule
    }

    // поиск записи по трем параметрам
    private async checkDuplicateSchedule(order: string, startDate: Date, login: string) {
        try {
            const findedSchedule = await this.prismaService.schedule.findFirst({
                where: {
                    order,
                    startDate,
                    login
                }
            })
    
            return findedSchedule
        }
        catch(err) {
            this.logger.error(`Ошибка при поиске дубликата записи расписания: ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    // создание записи в расписании
    async create(input: ScheduleCreateInput, authUsername: string):Promise<boolean> {
        const findedSchedule = await this.checkDuplicateSchedule(input.order, input.startDate, input.login)

        if (findedSchedule) {
            this.logger.error(`Запись расписания с такими параметрами (приказ, дата начала, логин) уже существует: (${input.order}, ${input.startDate.toISOString()}, ${input.login}) пользователем ${authUsername})`);
            throw new ConflictException('Запись расписания уже существует')
        }

        try {
            const newSchedule = await this.prismaService.schedule.create({
                data: {
                    ...input,
                    createdBy: authUsername,
                    updatedBy: authUsername
                }
            })

            this.logger.info(`Запись расписания создана: ${newSchedule.fio}-${newSchedule.order} пользователем ${authUsername}`);

            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (создание записи расписания): ${err.message} пользователем ${authUsername}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    // удаление записи расписания
    async delete(id: string, authUsername: string):Promise<boolean> {
        const findedSchedule = await this.findById(id)

        try {
            const deletedSchedule = await this.prismaService.schedule.delete({
                where: {
                    id
                }
            })

            this.logger.info(`Запись расписания удалена: ${deletedSchedule.fio}-${deletedSchedule.order} пользователем ${authUsername}`);

            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (удаление записи расписания): ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    // изменение записи
    async update(id: string, input: ScheduleUpdateInput, authUsername: string):Promise<boolean> {
        const findedSchedule = await this.findById(id)
        const data = {
            ...input,
            updatedBy: authUsername
        }
        try {
            const updatedSchedule = await this.prismaService.schedule.update({
                where: {
                    id
                },
                data
            })

            this.logger.info(`Запись расписания изменена: ${updatedSchedule.fio}-${updatedSchedule.order} пользователем ${authUsername}`);

            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (изменение записи расписания): ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }

    }
}
