import { Schedule } from '@prisma/client';
import enableOrDisableUser from '../cron-task/disableOrEnableUser';

// блокировка пользователей у которых начался период блокировки (дата начала)
export async function handleTaskToStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Обнуляем время для корректного сравнения дат

  // задачи, которые должны начаться сегодня
  const tasksToStart: Schedule[] = await this.prismaService.schedule.findMany({
    where: {
      startDate: {
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // до конца сегодняшнего дня
      },
      endDate: {
        gte: today,
      },
      status: false, // Ищем только неактивные задачи
      isRecall: false, // Которые не отозваны
    },
  });

  // цикл блокировки пользователей на дату начала
  for (const task of tasksToStart) {
    // функция включение или отключения пользователя в АД
    const ok = await enableOrDisableUser(
      { logger: this.logger, ldapService: this.ldapService },
      task,
      '514',
      false,
    );
    if (!ok) {
      continue;
    }

    // изменение статуса записи в БД
    try {
      await this.prismaService.schedule.update({
        where: { id: task.id },
        data: { status: true, updatedBy: 'system' },
      });
      this.logger.info(`Изменения в БД внесены: ${task.id}`, { label: 'cron' });
    } catch (err) {
      this.logger.error(
        `Ошибка при обновлении статусов в БД (${task.id}) — ${err.message}`,
        { label: 'cron' },
      );
      continue;
    }
  }
}
