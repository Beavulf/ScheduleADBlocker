import { NotFoundUserToFile } from "../cron-task/not-found-file";

export async function handleTaskToEnd() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // задачи и пользовтели которые должны быть разблокированы
    const tasksToEnd = await this.prismaService.schedule.findMany({
        where: {
            endDate: {
                // gte: yesterday,
                lte: endOfYesterday
            },
            status: true, // Ищем только активные задачи
            isRecall: false,
        }
    });

    // цикл разблокировки пользователей на дату окончания
    for (const task of tasksToEnd) {
        let findedUser;
        this.logger.info(`Разблокировка пользователя: ${task.login} по приказу ${task.order}`, {label: 'cron'});
        
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
            continue;
        }

        const {distinguishedName} = findedUser[0]

        if (!distinguishedName) {
            this.logger.error(`Отсутствует distinguishedName для пользователя: ${task.login} - пользователь не будет разблокирован.`, {label: 'cron'});
            await NotFoundUserToFile(task.fio, task.login, 'отсутствует distinguishedName');
            continue;
        }

        try {
            // блокируем пользователя
            await this.ldapService.enableOrDisableUser('512',{userDn:distinguishedName});
            this.logger.info(`Пользователь успешно разблокирован: ${task.login} - ${distinguishedName}`, {label: 'cron'});
        }
        catch(err) {
            await NotFoundUserToFile(task.fio, task.schedule.login, 'ошибка разблокировки АД');
            this.logger.error(
                `Ошибка при разблокировке пользователя в АД (Отзыв):  — ${err.message}`,
                { label: 'cron' }
            );
            continue;
        }

        try {
            await this.prismaService.schedule.update({
                where: { id: task.id },
                data: { status: false, updatedBy: 'system' }
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