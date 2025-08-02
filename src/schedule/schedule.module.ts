import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleResolver } from './schedule.resolver';
import { registerEnumType } from '@nestjs/graphql';
import { TypeTaskEnum } from '@prisma/client';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { LdapModule } from 'src/ldap/ldap.module';
import { ScheduleCronTaskService } from './cron-task.service';

registerEnumType(TypeTaskEnum, {
  name: 'TypeTaskEnum',
  description: 'Тип причины отсутствия',
});

@Module({
  imports: [NestScheduleModule.forRoot(), LdapModule],
  providers: [ScheduleResolver, ScheduleService, ScheduleCronTaskService],
})
export class ScheduleModule {}
