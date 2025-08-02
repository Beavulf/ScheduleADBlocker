import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { getGraphQlConfig } from './config/graphql.config';
import { AuthModule } from './auth/auth.module';
import { LdapModule } from './ldap/ldap.module';
import { WinstonModule } from 'nest-winston';
import { asyncWinstonConfig } from './config/winston.config';
import { OtdelModule } from './otdel/otdel.module';
import { ScheduleModule } from './schedule/schedule.module';
import { RecallModule } from './recall/recall.module';
import { OnetimeModule } from './onetime/onetime.module';


@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useFactory: getGraphQlConfig,
      inject: [ConfigService],
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: asyncWinstonConfig,
      inject: [ConfigService]
    }),
    AuthModule,
    LdapModule,
    OtdelModule,
    ScheduleModule,
    RecallModule,
    OnetimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
