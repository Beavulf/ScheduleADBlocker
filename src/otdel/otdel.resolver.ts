import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OtdelService } from './otdel.service';
import { CreateInput } from './inputs/create.input';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateModel } from './models/create.model';
import { UpdateInput } from './inputs/update.input';
import { GetAuthUserName } from 'src/common/decorators/get-auth-username';

@UseGuards(JwtAuthGuard)
@Resolver()
export class OtdelResolver {
  constructor(private readonly otdelService: OtdelService) {}

  @Mutation(()=> Boolean)
  async createOtdel(
    @Args('data') input: CreateInput, 
    @GetAuthUserName() authUsername: string
  ) {
    return await this.otdelService.create(input, authUsername)
  }

  @Mutation(()=> Boolean)
  async updateOtdel(
    @Args('id', {type: ()=> ID}) id: string,
    @Args('data') input: UpdateInput, 
    @GetAuthUserName() authUsername: string
  ) {
    return await this.otdelService.update(id, input, authUsername)
  }

  @Mutation(()=> Boolean)
  async deleteOtdel(
    @Args('id', {type: ()=> ID}) id: string, 
    @GetAuthUserName() authUsername: string,
  ) {
    return await this.otdelService.delete(id, authUsername)
  }

  @Query(()=>[CreateModel], {
    description: 'Получение списка отделов/ПТО'
  })
  async getOtdels() {
    return await this.otdelService.getOtdels()
  }
}
