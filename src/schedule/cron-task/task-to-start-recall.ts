import { NotFoundUserToFile } from "./not-found-file";

export async function handleTaskToStartRecall() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Обнуляем время для корректного сравнения дат

    this.logger.info('Запуск задачи по обработке расписания отзывов (раблокировка)...', {label: 'cron'});
    // 1. Найти задачи, которые должны начаться сегодня
    const tasksToStartRecall = await this.prismaService.recall.findMany({
        where: {
            startDate: {
                lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // до конца сегодняшнего дня
            },
            endDate: {
                gte: today,
            },
            status: false, // Ищем только активные задачи
        },
        include: {
            schedule: true
        }
    });

    // цикл блокировки пользователей на дату начала
    for (const task of tasksToStartRecall) {
        let findedUser;
       
        this.logger.info(`Раблокировка пользователя (Отзыв): ${task.schedule.login} по приказу ${task.order}`, {label: 'cron'});
        // поиск пользователя
        try{
            findedUser = await this.ldapService.searchLdapUser(task.schedule.login);
        }
        catch(err){
            this.logger.error(
                `Ошибка при поиске пользователя в АД (Отзыв):  — ${err.message}`,
                { label: 'cron' }
            );
            continue;
        }

        if (!findedUser.length) {
            this.logger.error(`Пользователь не найден в AD (Отзыв): ${task.schedule.login}`, {label: 'cron'});
            await NotFoundUserToFile(task.fio, task.schedule.login, 'раблокировка - Отзыв');
            continue; // продолжаем обработку остальных задач
        }

        const {distinguishedName} = findedUser[0]

        if (!distinguishedName) {
            this.logger.error(`Отсутствует distinguishedName для пользователя: ${task.schedule.login} - пользователь не будет разблокирован (Отзыв).`, {label: 'cron'});
            await NotFoundUserToFile(task.fio, task.schedule.login, 'отсутствует distinguishedName, раблокировка - Отзыв');
            continue;
        }

        // раблокируем пользователя в АД
        try {
            await this.ldapService.enableOrDisableUser('512',{userDn:distinguishedName});
            this.logger.info(`Пользователь успешно разблокирован (Отзыв): ${task.schedule.login} - ${distinguishedName}`, {label: 'cron'});
        }
        catch(err) {
            await NotFoundUserToFile(task.fio, task.schedule.login, 'ошибка разблокировки АД, раблокировка - Отзыв');
            this.logger.error(
                `Ошибка при разблокировке пользователя в АД (Отзыв):  — ${err.message}`,
                { label: 'cron' }
            );
            continue;
        }

        // Обновление статусов recall и schedule должно быть атомарным — используем транзакцию
        try {
            await this.prismaService.$transaction([
                this.prismaService.recall.update({
                    where: { id: task.id },
                    data: { status: true, updatedBy: 'system' }
                }),
                this.prismaService.schedule.update({
                    where: { id: task.scheduleId },
                    data: { isRecall: true, updatedBy: 'system' }
                })
            ]);

            this.logger.info(`Измнения в БД внесены (Отзыв): recallId=${task.id}, scheduleId=${task.scheduleId}`, {label: 'cron'});
        }
        catch(error) {
            this.logger.error(
                `Ошибка при обновлении статусов в БД (Отзыв): recallId=${task.id}, scheduleId=${task.scheduleId} — ${error.message}`,
                { label: 'cron' }
            );
            continue;
        }

    }
}