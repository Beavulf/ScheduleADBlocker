import { Args, ID, Mutation, Resolver, Query } from '@nestjs/graphql';
import { OnetimeService } from './onetime.service';
import { OneTimeCreateInput } from './inputs/create.input';
import { NotFoundException, UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetAuthUserName } from 'src/common/decorators/get-auth-username';
import { OneTimeFilterInput } from './inputs/filter.input';
import { FieldSortInput } from 'src/common/inputs/field-type/sort.input';
import { OneTimeGetModel } from './models/get.model';
import { OneTimeUpdateInput } from './inputs/update.input';
import { PrismaGqlExceptionFilter } from 'src/common/filters/prisma-gql-exception.filter';

@UseFilters(PrismaGqlExceptionFilter)
@Resolver()
export class OnetimeResolver {
  constructor(private readonly onetimeService: OnetimeService) {}

  @Mutation(() => Boolean, {
    description: 'Создание разовой задачи',
  })
  @UseGuards(JwtAuthGuard)
  async craeteOneTime(
    @Args('data') input: OneTimeCreateInput,
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.onetimeService.create(input, authUsername);
  }

  @Mutation(() => Boolean, {
    description: 'Удаление разовой задачи',
  })
  @UseGuards(JwtAuthGuard)
  async deleteOneTime(
    @Args('id', { type: () => ID }) id: string,
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.onetimeService.delete(id, authUsername);
  }

  @Mutation(() => Boolean, {
    description: 'Изменение разовой задачи',
  })
  @UseGuards(JwtAuthGuard)
  async updateOneTime(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') input: OneTimeUpdateInput,
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.onetimeService.update(id, input, authUsername);
  }

  @Query(() => [OneTimeGetModel], {
    description:
      'Получение списка отзывов (фильтр, сортировка, пропустить, сколько взять)',
  })
  @UseGuards(JwtAuthGuard)
  async getOneTimes(
    @Args('filter', { nullable: true }) filter?: OneTimeFilterInput,
    @Args('sort', {
      nullable: true,
      defaultValue: { field: 'createdAt', order: 'desc' },
    })
    sort?: FieldSortInput,
    @Args('skip', { nullable: true }) skip?: number,
    @Args('take', { nullable: true }) take?: number,
  ) {
    return await this.onetimeService.getOneTimes({ filter, sort, skip, take });
  }
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Архивация разовой задачи',
  })
  async archiveOneTime(@Args('id', { type: () => ID }) id: string) {
    const isArchive = await this.onetimeService.toArchive(id);
    if (!isArchive) {
      throw new NotFoundException(`Ошибка при архивации задачи ${id}`);
    }
    return isArchive;
  }

  @Query(() => [OneTimeGetModel], {
    description: 'Получение списка разовых задач из архива',
  })
  @UseGuards(JwtAuthGuard)
  async getArchiveOneTimes(
    @Args('filter', { nullable: true }) filter?: OneTimeFilterInput,
    @Args('sort', {
      nullable: true,
      defaultValue: { field: 'createdAt', order: 'desc' },
    })
    sort?: FieldSortInput,
    @Args('skip', { nullable: true }) skip?: number,
    @Args('take', { nullable: true }) take?: number,
  ) {
    return await this.onetimeService.getArchiveOneTimes({
      filter,
      sort,
      skip,
      take,
    });
  }
}
