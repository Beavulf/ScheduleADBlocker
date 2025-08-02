import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { LdapService } from './ldap.service';
import { SearchCnInput } from './inputs/search-cn.input';
import { UserModel } from './models/user.model';
import { ModifyInput } from './inputs/modify.input';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';


@Resolver()
export class LdapResolver {
  constructor(private readonly ldapService: LdapService) {}

  @UseGuards(JwtAuthGuard)
  @Query(() => [UserModel],{
    name: 'searchUser',
    description: 'Поиск пользователя в AD по ФИО (cn) или логину (samaccountname)'
  })
  async searchUser(@Args('data') input:SearchCnInput) {
    const {cnOrSamaccountname} = input
    return await this.ldapService.searchLdapUser(cnOrSamaccountname);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, {
    name: 'enableUser',
    description: 'Включение пользователя в AD'
  })
  async enableUser(@Args('data') userDn: ModifyInput){
    return await this.ldapService.enableOrDisableUser('512', userDn)
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, {
    name: 'disableUser',
    description: 'Отключение пользователя в AD'
  })
  async disableUser(@Args('data') userDn: ModifyInput){
    return await this.ldapService.enableOrDisableUser('514', userDn)
  }
}
