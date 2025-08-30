import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RecallService } from './recall.service';
import { RecallCreateInput } from './inputs/create.input';
import { GetAuthUserName } from 'src/common/decorators/get-auth-username';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RecallUpdateInput } from './inputs/update.input';
import { RecallFilterInput } from './inputs/filter.input';
import { FieldSortInput } from 'src/common/inputs/field-type/sort.input';
import { RecallGetModel } from './models/get.model';

@Resolver()
export class RecallResolver {
  constructor(private readonly recallService: RecallService) {}

  @Mutation(()=>Boolean, {
    description: 'Создание отзыва'
  })
  @UseGuards(JwtAuthGuard)
  async createRecall(
    @Args('data') input: RecallCreateInput, 
    @Args('idSchedule') idSchedule: string,
    @GetAuthUserName() authUsername: string
  ) {
    return await this.recallService.create(input, idSchedule, authUsername)
  }

  @Mutation(()=>Boolean, {
    description: 'Удаление отзыва'
  })
  @UseGuards(JwtAuthGuard)
  async deleteRecall(
    @Args('id', {type: ()=> ID}) id: string,
    @GetAuthUserName() authUsername: string
  ) {
    return await this.recallService.delete(id, authUsername)
  }

  @Mutation(()=>Boolean, {
    description: 'Изменение отзыва'
  })
  @UseGuards(JwtAuthGuard)
  async updateRecall(
    @Args('data') input: RecallUpdateInput, 
    @Args('id',{type: ()=> ID}) id: string,
    @GetAuthUserName() authUsername: string
  ) {
    return await this.recallService.update(id, input, authUsername)
  }

  @Query(()=>[RecallGetModel], {
    description: 'Получение списка отзывов (фильтр, сортировка, пропустить, сколько взять)'
  })
  @UseGuards(JwtAuthGuard)
  async getRecalls(
    @Args('filter', { nullable: true }) filter?: RecallFilterInput,
    @Args('sort', { nullable: true }) sort?: FieldSortInput,
    @Args('skip', { nullable: true }) skip?: number,
    @Args('take', { nullable: true }) take?: number,
  ) {
    return await this.recallService.getRecalls({ filter, sort, skip, take })
  }

  @Mutation(()=>Boolean, {
    description: 'Архивирование отзыва по айди'
  })
  async recallArchive(
    @Args('id', {type: ()=> ID}) id: string,
  ) {
    const isArchive = await this.recallService.toArchive(id)
    if(!isArchive) {
      throw new NotFoundException(`Ошибка архивирования отзыва ${id}`)
    }
    return isArchive
  }
}
