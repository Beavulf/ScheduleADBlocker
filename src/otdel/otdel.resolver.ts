import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OtdelService } from './otdel.service';
import { CreateInput } from './inputs/create.input';
import { UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateModel } from './models/create.model';
import { UpdateInput } from './inputs/update.input';
import { GetAuthUserName } from 'src/common/decorators/get-auth-username';
import { PrismaGqlExceptionFilter } from 'src/common/filters/prisma-gql-exception.filter';

@UseGuards(JwtAuthGuard)
@UseFilters(PrismaGqlExceptionFilter)
@Resolver()
export class OtdelResolver {
  constructor(private readonly otdelService: OtdelService) {}

  @Mutation(() => Boolean, {
    description: 'Добавить новый отдел',
  })
  async createOtdel(
    @Args('data') input: CreateInput,
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.otdelService.create(input, authUsername);
  }

  @Mutation(() => Boolean, {
    description: 'Изменить отдел',
  })
  async updateOtdel(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') input: UpdateInput,
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.otdelService.update(id, input, authUsername);
  }

  @Mutation(() => Boolean, {
    description: 'Удалить отдел из БД',
  })
  async deleteOtdel(
    @Args('id', { type: () => ID }) id: string,
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.otdelService.delete(id, authUsername);
  }

  @Query(() => [CreateModel], {
    description: 'Получение списка отделов/ПТО',
  })
  async getOtdels() {
    return await this.otdelService.getOtdels();
  }
}
