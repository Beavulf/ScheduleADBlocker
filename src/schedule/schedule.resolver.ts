import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ScheduleService } from './schedule.service';
import { ScheduleCreateInput } from './inputs/create.input';
import { GetAuthUserName } from 'src/common/decorators/get-auth-username';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ScheduleFilterInput } from './inputs/filter.input';
import { FieldSortInput } from '../common/inputs/field-type/sort.input';
import { ScheduleModel } from './models/schedule.model';
import { ScheduleUpdateInput } from './inputs/update.input';

@UseGuards(JwtAuthGuard)
@Resolver()
export class ScheduleResolver {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Mutation(()=>Boolean, {
    description: 'Добавление записи в расписание'
  })
  async createSchedule(
    @Args('data') input: ScheduleCreateInput, 
    @GetAuthUserName() authUsername: string
  ) {
    return await this.scheduleService.create(input, authUsername);
  }

  @Query(()=> [ScheduleModel], {
    description: 'Получение списка записей расписания  (фильтр, сортировка, пропустить, сколько взять)'
  })
  async getSchedules(
    @Args('filter', { nullable: true }) filter?: ScheduleFilterInput,
    @Args('sort', { nullable: true }) sort?: FieldSortInput,
    @Args('skip', { nullable: true }) skip?: number,
    @Args('take', { nullable: true }) take?: number,
  ) {
    return await this.scheduleService.getSchedules({ filter, sort, skip, take });
  }

  @Mutation(()=> Boolean, {
    description: 'Удаление записи расписания'
  })
  async deleteSchedule(
    @Args('id',{type: ()=> ID}) id: string, 
    @GetAuthUserName() authUsername: string
  ) {
    return await this.scheduleService.delete(id, authUsername);
  }

  @Mutation(()=> Boolean, {
    description: 'Изменение записи расписания'
  })
  async updateSchedule(
    @Args('id',{type: ()=> ID}) id: string, 
    @Args('data') input: ScheduleUpdateInput, 
    @GetAuthUserName() authUsername: string
  ) {
    return await this.scheduleService.update(id, input, authUsername);
  }

}