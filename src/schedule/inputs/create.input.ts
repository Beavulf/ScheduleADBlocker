import { Field, InputType } from '@nestjs/graphql';
import { TypeTaskEnum } from '@prisma/client';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinDate,
  MinLength,
} from 'class-validator';

@InputType()
export class ScheduleCreateInput {
  @Field(() => String, {
    description: 'ФИО',
  })
  @IsNotEmpty({
    message: 'Поле ФИО не может быть пустым',
  })
  @IsString({
    message: 'Поле ФИО должно быть строкой',
  })
  @MinLength(2, {
    message: 'Минимальная длина ФИО - 6 символов',
  })
  @MaxLength(250, {
    message: 'Максимальная длина ФИО - 250 символов',
  })
  fio: string;

  @Field(() => String, {
    description: 'Логин пользователя латиницей',
  })
  @IsNotEmpty({
    message: 'Поле логина не может быть пустым',
  })
  @IsString({
    message: 'Поле логина должно быть строкой',
  })
  @MinLength(6, {
    message: 'Минимальная длина логина - 6 символов',
  })
  @MaxLength(50, {
    message: 'Максимальная длина логина - 50 символов',
  })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Логин может содержать только латинские буквы, цифры и символы: . _ -',
  })
  login: string;

  @Field(() => Date, {
    description: 'Дата начала задачи (когда пользователь блокируется)',
  })
  @IsNotEmpty({
    message: 'Поле даты начала не может быть пустым',
  })
  @IsDate({
    message: 'Поле даты начала должно быть датой',
  })
  startDate: Date;

  @Field(() => Date, {
    description: 'Дата окончания задачи (когда пользователь разблокируется)',
  })
  @IsNotEmpty({
    message: 'Поле даты окончания не может быть пустым',
  })
  @IsDate({
    message: 'Поле даты окончания должно быть датой',
  })
  endDate: Date;

  @Field(() => Boolean, {
    description: 'Выполняется ли задача сейчас',
    nullable: true,
  })
  @IsBoolean({
    message: 'Поле статуса должно быть булевым значением',
  })
  @IsOptional()
  status?: boolean;

  @Field(() => String, {
    description: 'Номер приказа',
  })
  @IsNotEmpty({
    message: 'Поле приказа не может быть пустым',
  })
  @IsString({
    message: 'Поле приказа должно быть строкой',
  })
  @MinLength(3, {
    message: 'Минимальная длина приказа - 3 символов',
  })
  @MaxLength(20, {
    message: 'Максимальная длина приказа - 20 символов',
  })
  order: string;

  @Field(() => Boolean, {
    description: 'Отозван ли сотрудник из задачи (должен быть разблокирован)',
    nullable: true,
  })
  @IsBoolean({
    message: 'Поле статуса должно быть булевым значением',
  })
  @IsOptional()
  isRecall?: boolean;

  @Field(() => TypeTaskEnum, {
    description: 'Причина блокировки пользователя',
  })
  @IsNotEmpty({
    message: 'Поле типа задачи не может быть пустым',
  })
  @IsEnum(TypeTaskEnum, {
    message: 'Поле типа задачи должно быть одним из перечисленных значений',
  })
  type: TypeTaskEnum;

  @Field(() => String, {
    description: 'Описание задачи (примечание)',
    nullable: true,
  })
  @IsString({
    message: 'Поле описания должно быть строкой',
  })
  @MaxLength(500, {
    message: 'Максимальная длина описания - 500 символов',
  })
  @IsOptional()
  description?: string;
}
