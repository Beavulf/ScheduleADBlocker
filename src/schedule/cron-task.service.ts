import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from 'winston';
import { PrismaService } from 'src/prisma/prisma.service';
import { LdapService } from 'src/ldap/ldap.service';

@Injectable()
export class ScheduleCronTaskService {
    constructor(
        @Inject('winston') private readonly logger: Logger,
        private readonly prismaService: PrismaService,
        private readonly ldapService: LdapService,
    ) {}
    
    @Cron(CronExpression.EVERY_30_SECONDS, {
        name: 'handleUserBlocking',
        timeZone: 'Europe/Moscow', // Укажите вашу временную зону
    })
    async handleScheduledTasks() {
        const start = new Date()
        this.logger.info('Запуск задачи по обработке расписания блокировок...');
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Обнуляем время для корректного сравнения дат

        // 1. Найти задачи, которые должны начаться сегодня
        const tasksToStart = await this.prismaService.schedule.findMany({
            where: {
                startDate: {
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // до конца сегодняшнего дня
                },
                endDate: {
                    gte: today,
                },
                status: false, // Ищем только неактивные задачи
                isRecall: false, // Которые не отозваны
            }
        });

        // цикл блокировки пользователей на дату начала
        for (const task of tasksToStart) {
            this.logger.info(`Блокировка пользователя: ${task.login} по приказу ${task.order}`);
            const findedUser = await this.ldapService.searchLdapUser(task.login);
            const {distinguishedName} = findedUser[0]
            if (!findedUser.length) {
                this.logger.error(`Пользователь не найден в AD: ${task.login}`);
                return;
            }
            if (!distinguishedName) {
                this.logger.error(`Отсутствует distinguishedName для пользователя: ${task.login} - пользователь не будет заблокирован.`);
                return;
            }
            // блокируем пользователя
            await this.ldapService.enableOrDisableUser('514',{userDn:distinguishedName});

            await this.prismaService.schedule.update({
                where: { id: task.id },
                data: { status: true, updatedBy: 'system' }
            });
            this.logger.info(`Пользователь успешно заблокирован: ${task.login}`);
        }

        // 2. Найти задачи, которые должны закончиться вчера
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);

        const tasksToEnd = await this.prismaService.schedule.findMany({
            where: {
                endDate: {
                    gte: yesterday,
                    lte: endOfYesterday
                },
                status: true, // Ищем только активные задачи
                isRecall: false,
            }
        });

        // цикл разблокировки пользователей на дату окончания
        for (const task of tasksToEnd) {
            this.logger.info(`Разблокировка пользователя: ${task.login} по приказу ${task.order}`);
            const findedUser = await this.ldapService.searchLdapUser(task.login);
            const {distinguishedName} = findedUser[0]

            if (!findedUser.length) {
                this.logger.error(`Пользователь не найден в AD: ${task.login}`);
                return;
            }
            if (!distinguishedName) {
                this.logger.error(`Отсутствует distinguishedName для пользователя: ${task.login} - пользователь не будет разблокирован.`);
                return;
            }

            // блокируем пользователя
            await this.ldapService.enableOrDisableUser('512',{userDn:distinguishedName});

            await this.prismaService.schedule.update({
                where: { id: task.id },
                data: { status: false, updatedBy: 'system' }
            });
            this.logger.info(`Пользователь успешно разблокирован: ${task.login}`);
        }
        console.log(`(${Date.now() - start.getTime()}мс}).`);
        
        this.logger.info(`Задача по обработке расписания блокировок завершена (${Date.now() - start.getTime()}мс}).`);
    }
}