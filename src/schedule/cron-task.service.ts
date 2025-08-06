import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from 'winston';
import { PrismaService } from 'src/prisma/prisma.service';
import { LdapService } from 'src/ldap/ldap.service';
import { handleTaskToStart } from './cron-task/task-to-start';
import { handleTaskToEnd } from './cron-task/task-to-end';
import { handleTaskToStartRecall } from './cron-task/task-to-start-recall';
import { handleTaskToEndRecall } from './cron-task/task-to-end-recall';

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
        this.logger.info('Запуск задачи по обработке расписания блокировок...', {label: 'cron'});
        
        await handleTaskToStartRecall.call(this);
        await handleTaskToEndRecall.call(this);
        await handleTaskToStart.call(this);
        await handleTaskToEnd.call(this);
        console.log(`${Date.now() - start.getTime()}мс`);
        
        this.logger.info(`Задача по обработке расписания блокировок завершена (${Date.now() - start.getTime()}мс).`, {label: 'cron'});
    }
}