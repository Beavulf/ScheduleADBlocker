import enableOrDisableUser from '../cron-task/disableOrEnableUser';

export async function handleTaskToEndRecall() {
  // 1) Рассчитываем границы вчерашнего дня
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Конец дня (23:59:59.999)
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  // 2) Ищем recall-задачи, которые к концу вчерашнего дня должны завершиться
  const tasksToEndRecall = await this.prismaService.recall.findMany({
    where: {
      endDate: {
        // gte: yesterday, // если нужно учитывать только вчерашний день; иначе — всё до конца вчера
        lte: endOfYesterday,
      },
      status: true, // Ищем только активные (идущие) задачи
    },
    include: {
      schedule: true,
    },
  });

  // 3) Для каждой найденной задачи: блокируем пользователя и обновляем статусы
  for (const task of tasksToEndRecall) {
    // функция включение или отключения пользователя в АД
    const ok = await enableOrDisableUser(
      { logger: this.logger, ldapService: this.ldapService },
      task,
      '514',
      true,
    );
    if (!ok) {
      continue;
    }

    const isArchive = await this.recallService.toArchive(task.id);
    if (!isArchive) {
      continue;
    }
  }
}
