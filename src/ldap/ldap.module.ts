import { Module } from '@nestjs/common';
import { LdapService } from './ldap.service';
import { LdapResolver } from './ldap.resolver';
import { LdapStrategy } from './strategys/ldap.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'ldap' })],
  providers: [LdapResolver, LdapService, LdapStrategy],
  exports: [LdapService, LdapStrategy]
})
export class LdapModule {}
