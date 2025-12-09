import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { LoginInput } from './inputs/login.input';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { AuthModel } from './models/auth.models';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response, Request } from 'express';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthModel, {
    description:
      'Аавторизация пользователя по его Логину и Паролю из АД, возврат токена доступа.',
  })
  @UseGuards(GqlAuthGuard)
  async auth(
    @Args('data') input: LoginInput,
    @Context('res') res: Response,
    @Context('req') req,
  ) {
    if (!req.user.sAMAccountName) {
      throw new NotFoundException('Пользователь не найден в Запросе(req)');
    }

    return await this.authService.auth(res, req.user.sAMAccountName);
  }

  @Mutation(() => Boolean, {
    description: 'Деавторизация (выход) пользователя из программы.',
  })
  async logout(@Context('res') res: Response) {
    return await this.authService.logout(res);
  }

  @Mutation(() => AuthModel, {
    description:
      'Обновление токена доступа пользователя через Рефреш токен в куках.',
  })
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Context() context) {
    return await this.authService.refreshToken(context.res, context.req);
  }
}
