import { Args, Context, GraphQLExecutionContext, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { UseGuards } from '@nestjs/common';
import { LoginInput } from './inputs/login.input';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { AuthModel } from './models/auth.models';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(()=>AuthModel)
  @UseGuards(GqlAuthGuard)
  async auth(@Args('data') input: LoginInput, @Context('res') res,) {
    return await this.authService.auth(res, input.username)
  }

  @Mutation(()=>Boolean)
  async logout(@Context() context) {
    return await this.authService.logout(context.res)
  }

  @Mutation(()=>AuthModel)
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Context() context) {
    return await this.authService.refreshToken(context.res, context.req)
  }
}
