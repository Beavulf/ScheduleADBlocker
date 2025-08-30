import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInput } from './inputs/create.input';
import { Otdel } from '@prisma/client';
import { UpdateInput } from './inputs/update.input';
import { Logger } from 'winston';
import { CreateModel } from './models/create.model';

@Injectable()
export class OtdelService {
    constructor(
        private readonly prismaService: PrismaService,
        @Inject('winston') private readonly logger: Logger

    ) {}

    // создание записи
    async create(input: CreateInput, authUsername: string): Promise<boolean> {
        try {
            const otdel = await this.prismaService.otdel.create({
                data: {
                    ...input,
                    createdBy: authUsername,
                    updatedBy: authUsername
                }
            })
            this.logger.info(`Отдел создан: ${otdel.name} пользователем ${authUsername}`);
            return true
        }
        catch(err) {
            if (err.code === 'P2002') {
                this.logger.error(`Ошибка при создании отдела: ${err.message} пользователем ${authUsername} (запись с такими параметрами уже существует)`);
                throw new Error('Запись с такими уникальными полями уже существует');
            }
            this.logger.error(`Ошибка при работе с БД (создание отдела): ${err.message} пользователем ${authUsername}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    // поиск отдела по id
    async findById(id: string) {
        const findedOtdel = await this.prismaService.otdel.findUnique({
            where: {
                id
            }
        })

        if (!findedOtdel) {
            throw new NotFoundException('Отдел не найден')
        }

        return findedOtdel
    }

    // изменение записи
    async update(id: string, input: UpdateInput, authUsername: string):Promise<boolean> {
        const findedOtdel = await this.findById(id)
        const data = {
            ...input,
            updatedBy: authUsername
        }
        try {
            await this.prismaService.otdel.update({
                where: {
                    id
                },
                data
            })

            this.logger.info(`Отдел изменен: ${findedOtdel.name} пользователем ${authUsername}`);
            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (изменение): ${err.message} пользователем ${authUsername}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    // удаление отдела
    async delete(id: string, authUsername: string):Promise<boolean> {
        const findedOtdel = await this.findById(id)
        try {
            await this.prismaService.otdel.delete({
                where: {
                    id
                }
            })
            this.logger.info(`Отдел удален: ${findedOtdel.name} пользователем ${authUsername}`);
            return true
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (удаление): ${err.message} пользователем ${authUsername}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }

    async getOtdels():Promise<CreateModel[]> {
        try {
            const otdels: CreateModel[] = await this.prismaService.otdel.findMany()

            return otdels
        }
        catch(err) {
            this.logger.error(`Ошибка при работе с БД (получение отделов): ${err.message}`);
            throw new InternalServerErrorException(`Ошибка при работе с БД - ${err.code}`)
        }
    }
}
