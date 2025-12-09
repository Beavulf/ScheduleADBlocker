import { Field, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@ObjectType()
export class OneTimeGetModel {
  @Field(() => String, {
    description: 'Айди записи',
  })
  id: string;

  @Field(() => String, {
    description: 'ФИО пользователя',
  })
  fio: string;

  @Field(() => String, {
    description: 'Логин пользователя',
  })
  login: string;

  @Field(() => Boolean, {
    description:
      'Что сделать с пользователем - включить или отключить (true/false)',
  })
  state: boolean;

  @Field(() => Date, {
    description: 'Дата выполнения задачи',
  })
  date: Date;

  @Field(() => Boolean, {
    description: 'Выполненна ли задача',
  })
  isCompleate: boolean;

  @IsOptional()
  @Field(() => String, {
    description: 'Описание задачи',
    nullable: true,
  })
  description?: string | null;

  @Field(() => Date, {
    description: 'Дата создания записи',
  })
  createdAt: Date;

  @Field(() => Date, {
    description: 'Дата обновления записи',
  })
  updatedAt: Date;

  @Field(() => String, {
    description: 'Имя пользователя, создавшего запись',
  })
  createdBy: string;

  @Field(() => String, {
    description: 'Имя пользователя, обновляющего запись',
  })
  updatedBy: string;
}
