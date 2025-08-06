import { NotFoundUserToFile } from "../cron-task/not-found-file";

export async function handleTaskToEndRecall() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // задачи и пользовтели которые должны быть разблокированы
    const tasksToEndRecall = await this.prismaService.recall.findMany({
        where: {
            endDate: {
                // gte: yesterday,
                lte: endOfYesterday
            },
            status: true, // Ищем только активные задачи
        },
        include: {
            schedule: true
        }
    });

    // цикл блокировки пользователей на дату окончания Отзыва
    for (const task of tasksToEndRecall) {
        let findedUser;
        
        this.logger.info(`Блокировка пользователя (Отзыв): ${task.schedule.login} по приказу ${task.order}`, {label: 'cron'});
        
        try {
            findedUser = await this.ldapService.searchLdapUser(task.schedule.login);
        }
        catch(err) {
            this.logger.error(
                `Ошибка при поиске пользователя в АД (Отзыв):  — ${err.message}`,
                { label: 'cron' }
            );
            continue;
        }

        if (!findedUser.length) {
            this.logger.error(`Пользователь не найден в AD (Отзыв): ${task.schedule.login}`, {label: 'cron'});
            await NotFoundUserToFile(task.fio, task.schedule.login, 'блокировка - Отзыв');
            continue;
        }

        const {distinguishedName} = findedUser[0]

        if (!distinguishedName) {
            this.logger.error(`Отсутствует distinguishedName для пользователя (Отзыв): ${task.schedule.login} - пользователь не будет разблокирован.`, {label: 'cron'});
            await NotFoundUserToFile(task.fio, task.schedule.login, 'отсутствует distinguishedName, блокировка - Отзыв');
            continue;
        }

        try {
            // блокируем пользователя
            await this.ldapService.enableOrDisableUser('514',{userDn:distinguishedName});
            this.logger.info(`Пользователь успешно заблокирован (Отзыв): ${task.schedule.login} - ${distinguishedName}`, {label: 'cron'});
        }
        catch(err) {
            await NotFoundUserToFile(task.fio, task.schedule.login, 'ошибка блокировки АД, блокировка - Отзыв');
            this.logger.error(
                `Ошибка при блокировке пользователя в АД (Отзыв):  — ${err.message}`,
                { label: 'cron' }
            );
            continue;
        }
        
        // Обновление статусов recall и schedule должно быть атомарным — используем транзакцию
        try {
            await this.prismaService.$transaction([
                this.prismaService.recall.update({
                    where: { id: task.id },
                    data: { status: false, updatedBy: 'system' }
                }),
                this.prismaService.schedule.update({
                    where: { id: task.scheduleId },
                    data: { isRecall: false, updatedBy: 'system' }
                })
            ]);

            this.logger.info(`Измнения в БД внесены (Отзыв): recallId=${task.id}, scheduleId=${task.scheduleId}`, {label: 'cron'});
        } catch (error) {
            this.logger.error(
                `Ошибка при обновлении статусов в БД (Отзыв): recallId=${task.id}, scheduleId=${task.scheduleId} — ${error.message}`,
                { label: 'cron' }
            );
            continue;
        }

    }
}