import { Schedule } from "@prisma/client";
import enableOrDisableUser from "../cron-task/disableOrEnableUser";

// разблокировка пользователей у которых закончился период блокировки (дата окончания)
export async function handleTaskToEnd() {
    // вчерашний день
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // начало дня
    yesterday.setHours(0, 0, 0, 0);

    // конец вчерашнего дня
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // задачи и пользователи, которые должны быть разблокированы
    const tasksToEnd: Schedule[] = await this.prismaService.schedule.findMany({
        where: {
            endDate: {
                // gte: yesterday, //если надо учитывать только вчерашний день, иначе все что до сегодня
                lte: endOfYesterday
            },
            status: true, // Ищем только активные задачи
            isRecall: false,
        }
    });

    // цикл разблокировки пользователей на дату окончания
    for (const task of tasksToEnd) {
        // функция включение или отключения пользователя в АД
        const ok = await enableOrDisableUser(
            { logger: this.logger, ldapService: this.ldapService },
            task,
            '512',
            false
        );
        if (!ok) {
            continue;
        }

        // отправка в архив записи расписание и его отзыва если есть возврат - true, false
        const isArchive = await this.scheduleService.toArchive(task.id);
        if (!isArchive) {
            continue;
        }
        
    }
}