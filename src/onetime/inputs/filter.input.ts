import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinDate,
  MinLength,
} from 'class-validator';
import { DateFilterInput } from 'src/common/inputs/field-type/date-filter.input';
import { StringFilterInput } from 'src/common/inputs/field-type/string-filter.input';

@InputType()
export class OneTimeFilterInput {
  @IsOptional()
  @Field(() => String, {
    description: 'Айди записи',
    nullable: true,
  })
  id?: string;

  @IsOptional()
  @Field(() => StringFilterInput, {
    description: 'ФИО пользователя',
    nullable: true,
  })
  fio?: StringFilterInput;

  @IsOptional()
  @Field(() => StringFilterInput, {
    description: 'Логин пользователя',
    nullable: true,
  })
  login?: StringFilterInput;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, {
    description:
      'Что сделать с пользователем - включить или отключить (true/false)',
    nullable: true,
  })
  state?: boolean;

  @IsOptional()
  @Field(() => DateFilterInput, {
    description: 'Дата выполнения задачи',
    nullable: true,
  })
  date?: DateFilterInput;

  @IsOptional()
  @Field(() => Boolean, {
    description: 'Выполненна ли задача',
    nullable: true,
  })
  isCompleate?: boolean;

  @IsOptional()
  @Field(() => StringFilterInput, {
    description: 'Описание задачи',
    nullable: true,
  })
  description?: StringFilterInput;

  @IsOptional()
  @Field(() => DateFilterInput, {
    description: 'Дата создания записи',
    nullable: true,
  })
  createdAt?: DateFilterInput;

  @IsOptional()
  @Field(() => DateFilterInput, {
    description: 'Дата обновления записи',
    nullable: true,
  })
  updatedAt?: DateFilterInput;

  @IsOptional()
  @Field(() => StringFilterInput, {
    description: 'Имя пользователя, создавшего запись',
    nullable: true,
  })
  createdBy?: StringFilterInput;

  @IsOptional()
  @Field(() => StringFilterInput, {
    description: 'Имя пользователя, обновляющего запись',
    nullable: true,
  })
  updatedBy?: StringFilterInput;
}
