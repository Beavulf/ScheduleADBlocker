import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInput } from './inputs/create.input';
import { UpdateInput } from './inputs/update.input';
import { Logger } from 'winston';
import { CreateModel } from './models/create.model';
import { Otdel } from '@prisma/client';

@Injectable()
export class OtdelService {
    constructor(
        private readonly prismaService: PrismaService,
        @Inject('winston') private readonly logger: Logger
    ) {}

    // создание записи
    async create(input: CreateInput, authUsername: string):Promise<boolean> {
        await this.prismaService.otdel.create({
            data: {
                ...input,
                createdBy: authUsername,
                updatedBy: authUsername
            }
        })
        this.logger.info(`Отдел создан: ${input.name} пользователем ${authUsername}`);
        return true;
    }

    // поиск отдела по id
    async findById(id: string) {
        const findedOtdel = await this.prismaService.otdel.findUniqueOrThrow({
            where: {
                id
            }
        })
        return findedOtdel;
    }

    // изменение записи
    async update(id: string, input: UpdateInput, authUsername: string):Promise<boolean> {
        await this.findById(id)
        const data = {
            ...input,
            updatedBy: authUsername
        }
        await this.prismaService.otdel.update({
            where: {
                id
            },
            data
        })

        this.logger.info(`Отдел изменен: ${input.name} пользователем ${authUsername}`);
        return true;
    }

    // удаление отдела
    async delete(id: string, authUsername: string):Promise<boolean> {
        const findedOtdel = await this.findById(id)
        await this.prismaService.otdel.delete({
            where: {
                id
            }
        })
        this.logger.info(`Отдел удален: ${findedOtdel.name} пользователем ${authUsername}`);
        return true;
    }

    // получение списка отделов
    async getOtdels():Promise<CreateModel[]> {
        const otdels: CreateModel[] = await this.prismaService.otdel.findMany()
        return otdels;
    }
}
