import { OneTime } from "@prisma/client";
import enableOrDisableUser from "../cron-task/disableOrEnableUser";

export async function handleTaskToOneTime() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    // поиск разовых задач, которые должны выполниться сегодня
    const tasksToOneTime: OneTime[] = await this.prismaService.oneTime.findMany({
        where: {
            date: {
                gte: today,
                lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // только сегодняшний день
            },
            isCompleate: false,
        }
    });

    for (const task of tasksToOneTime) {
        const state = task.state === false ? '514' : '512'
        // функция включение или отключения пользователя в АД
        const ok = await enableOrDisableUser(
            { logger: this.logger, ldapService: this.ldapService },
            task,
            state,
            false
        );
        if (!ok) {
            continue;
        }
        
        const isArchive = await this.onetimeService.toArchive(task.id);
        if (!isArchive) {
            continue;
        }
    }
}