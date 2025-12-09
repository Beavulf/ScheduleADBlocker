import enableOrDisableUser from '../cron-task/disableOrEnableUser';

export async function handleTaskToStartRecall() {
  // 1) Рассчитываем границы текущего дня
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Обнуляем время для корректного сравнения дат

  this.logger.info(
    'Запуск задачи по обработке расписания отзывов (разблокировка)...',
    { label: 'cron' },
  );
  // 2) Находим задачи (recall), которые должны начаться сегодня
  const tasksToStartRecall = await this.prismaService.recall.findMany({
    where: {
      startDate: {
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // до конца сегодняшнего дня
      },
      endDate: {
        gte: today,
      },
      status: false, // Ищем только неактивные (ещё не обработанные) задачи
    },
    include: {
      schedule: true,
    },
  });

  // 3) Проходим по найденным recall-задачам: разблокируем пользователя и обновляем статусы
  for (const task of tasksToStartRecall) {
    // функция включение или отключения пользователя в АД
    const ok = await enableOrDisableUser(
      { logger: this.logger, ldapService: this.ldapService },
      task,
      '512',
      true,
    );
    if (!ok) {
      continue;
    }

    // 3.4) Обновляем статусы recall и schedule в одной транзакции (атомарно)
    try {
      await this.prismaService.$transaction([
        this.prismaService.recall.update({
          where: { id: task.id },
          data: { status: true, updatedBy: 'system' },
        }),
        this.prismaService.schedule.update({
          where: { id: task.scheduleId },
          data: { isRecall: true, updatedBy: 'system' },
        }),
      ]);

      this.logger.info(
        `Изменения в БД внесены (Отзыв): recallId=${task.id}, scheduleId=${task.scheduleId}`,
        { label: 'cron' },
      );
    } catch (error) {
      this.logger.error(
        `Ошибка при обновлении статусов в БД (Отзыв): recallId=${task.id}, scheduleId=${task.scheduleId} — ${error.message}`,
        { label: 'cron' },
      );
      continue;
    }
  }
}
