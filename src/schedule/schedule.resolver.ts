import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ScheduleService } from './schedule.service';
import { ScheduleCreateInput } from './inputs/create.input';
import { GetAuthUserName } from 'src/common/decorators/get-auth-username';
import { NotFoundException, UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ScheduleFilterInput } from './inputs/filter.input';
import { FieldSortInput } from '../common/inputs/field-type/sort.input';
import { ScheduleModel } from './models/schedule.model';
import { ScheduleUpdateInput } from './inputs/update.input';
import { ScheduleCronTaskService } from './cron-task.service';
import { CronTaskInfoModel } from './models/cron-task-info.model';
import { PrismaGqlExceptionFilter } from 'src/common/filters/prisma-gql-exception.filter';

@UseGuards(JwtAuthGuard)
@UseFilters(PrismaGqlExceptionFilter)
@Resolver()
export class ScheduleResolver {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly cronService: ScheduleCronTaskService,
  ) {}

  @Mutation(() => Boolean, {
    description: 'Добавление записи в расписание',
  })
  async createSchedule(
    @Args('data') input: ScheduleCreateInput,
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.scheduleService.create(input, authUsername);
  }

  @Query(() => [ScheduleModel], {
    description:
      'Получение списка записей расписания (фильтр, сортировка, пропустить, сколько взять)',
  })
  async getSchedules(
    @Args('filter', { nullable: true }) filter?: ScheduleFilterInput,
    @Args('sort', {
      nullable: true,
      defaultValue: { field: 'createdAt', order: 'desc' },
    })
    sort?: FieldSortInput,
    @Args('skip', { nullable: true }) skip?: number,
    @Args('take', { nullable: true }) take?: number,
  ) {
    return await this.scheduleService.getSchedules({
      filter,
      sort,
      skip,
      take,
    });
  }

  @Mutation(() => Boolean, {
    description: 'Удаление записи расписания',
  })
  async deleteSchedule(
    @Args('id', { type: () => ID }) id: string,
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.scheduleService.delete(id, authUsername);
  }

  @Mutation(() => Boolean, {
    description: 'Изменение записи расписания',
  })
  async updateSchedule(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') input: ScheduleUpdateInput,
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.scheduleService.update(id, input, authUsername);
  }

  @Mutation(() => Boolean, {
    description:
      'Архивирование записи расписания с указанием необходимо ли отправлять в архив связанный отзыв',
  })
  async archiveSchedule(
    @Args('id', { type: () => ID }) id: string,
    @Args('shouldArchiveRecall') shouldArchiveRecall: boolean,
  ) {
    const isArchive = await this.scheduleService.toArchive(
      id,
      shouldArchiveRecall,
    );
    if (!isArchive) {
      throw new NotFoundException(
        `Ошибка архивирования записи расписания ${id}`,
      );
    }
    return true;
  }

  @Query(() => [ScheduleModel], {
    description:
      'Получение списка АРХИВНЫХ записей расписания (фильтр, сортировка, пропустить, сколько взять)',
  })
  async getArchiveSchedules(
    @Args('filter', { nullable: true }) filter?: ScheduleFilterInput,
    @Args('sort', {
      nullable: true,
      defaultValue: { field: 'createdAt', order: 'desc' },
    })
    sort?: FieldSortInput,
    @Args('skip', { nullable: true }) skip?: number,
    @Args('take', { nullable: true }) take?: number,
  ) {
    return await this.scheduleService.getArchiveSchedules({
      filter,
      sort,
      skip,
      take,
    });
  }

  // ==================== CRON TASKS MANAGEMENT ====================

  @Query(() => CronTaskInfoModel, {
    description: 'Получение информации о задаче расписания',
  })
  async getCronTaskInfo(
    @Args('taskName') taskName: string,
    @Context() context,
  ) {
    return await this.cronService.getCronTaskInfo(taskName);
  }

  @Mutation(() => Boolean, {
    description: 'Горячий запуск задачи (выполнить прямо сейчас)',
  })
  async fireOnTick(@Args('taskName') taskName: string) {
    return await this.cronService.fireOnTick(taskName);
  }

  @Mutation(() => Boolean, {
    description: 'Запустить задачу раписания',
  })
  async startTaskSchedule(@Args('taskName') taskName: string) {
    return await this.cronService.startTask(taskName);
  }

  @Mutation(() => Boolean, {
    description: 'Остановить задачу раписания',
  })
  async stopTaskSchedule(@Args('taskName') taskName: string) {
    return await this.cronService.stopTask(taskName);
  }

  @Mutation(() => Boolean, {
    description: 'Изменить расписание выполнения cron задачи',
  })
  async updateTaskSchedule(
    @Args('taskName') taskName: string,
    @Args('cronExpression') cronExpression: string,
    @Args('timeZone', { nullable: true }) timeZone?: string,
  ) {
    return await this.cronService.updateCronTask(
      taskName,
      cronExpression,
      timeZone,
    );
  }
}
