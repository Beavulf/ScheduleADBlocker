import { NotFoundUserToFile } from "../cron-task/not-found-file";


export async function handleTaskToStart() {
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
        let findedUser;
        
        this.logger.info(`Блокировка пользователя: ${task.login} по приказу ${task.order}`, {label: 'cron'});
        
        try{
            findedUser = await this.ldapService.searchLdapUser(task.login);
        }
        catch(err){
            this.logger.error(
                `Ошибка при поиске пользователя в АД — ${err.message}`,
                { label: 'cron' }
            );
            continue;
        }

        if (!findedUser.length) {
            this.logger.error(`Пользователь не найден в AD: ${task.login}`, {label: 'cron'});
            await NotFoundUserToFile(task.fio, task.login);
            continue; // продолжаем обработку остальных задач
        }
        
        const {distinguishedName} = findedUser[0]

        if (!distinguishedName) {
            this.logger.error(`Отсутствует distinguishedName для пользователя: ${task.login} - пользователь не будет заблокирован.`, {label: 'cron'});
            await NotFoundUserToFile(task.fio, task.login, 'отсутствует distinguishedName');
            continue;
        }

        try {
            // блокируем пользователя
            await this.ldapService.enableOrDisableUser('514',{userDn:distinguishedName});
            this.logger.info(`Пользователь успешно заблокирован: ${task.login} - ${distinguishedName}`, {label: 'cron'});
        }
        catch(err) {
            await NotFoundUserToFile(task.fio, task.schedule.login, 'ошибка блокировки АД');
            this.logger.error(
                `Ошибка при блокировке пользователя в АД (Отзыв):  — ${err.message}`,
                { label: 'cron' }
            );
            continue;
        }
        
        try {
            await this.prismaService.schedule.update({
                where: { id: task.id },
                data: { status: true, updatedBy: 'system' }
            });

            this.logger.info(`Измнения в БД внесены: ${task.id}`, {label: 'cron'});
        }
        catch(err) {
            this.logger.error(
                `Ошибка при обновлении статусов в БД (${task.id}) — ${err.message}`,
                { label: 'cron' }
            );
            continue;
        }
    }
}