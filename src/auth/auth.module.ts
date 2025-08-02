import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getJwtConfig } from './config/jwt.config';
import { LdapModule } from 'src/ldap/ldap.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategys/jwt.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
    }),
    LdapModule,
    PassportModule
],
  providers: [AuthResolver, AuthService, JwtStrategy],
})

export class AuthModule {}
