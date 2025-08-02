import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsDate, IsOptional, IsString, MaxLength, MinDate, MinLength } from "class-validator";
import { DateFilterInput } from "src/common/inputs/field-type/date-filter.input";
import { StringFilterInput } from "src/common/inputs/field-type/string-filter.input";

@InputType()
export class OneTimeFilterInput {
    @IsOptional()
    @Field(()=>String, {
        description: 'Айди записи',
        nullable: true
    })
    id?: string;

    @IsOptional()
    @IsString({
        message: 'Поле ФИО должно быть строкой'
    })
    @MinLength(6, {
        message: 'Минимальная длина ФИО - 6 символов'
    })
    @MaxLength(250, {
        message: 'Максимальная длина ФИО - 250 символов'
    })
    @Field(()=>StringFilterInput, {
        description: 'ФИО пользователя',
        nullable: true
    })
    fio?: StringFilterInput;

    @IsOptional()
    @IsString({
        message: 'Поле логина должно быть строкой'
    })
    @MinLength(4, {
        message: 'Минимальная длина логина - 4 символа'
    })
    @MaxLength(40, {
        message: 'Максимальная длина логина - 40 символов'
    })
    @Field(()=>StringFilterInput, {
        description: 'Логин пользователя',
        nullable: true
    })
    login?: StringFilterInput;

    @IsOptional()
    @IsBoolean()
    @Field(()=>Boolean, {
        description: 'Что сделать с пользователем - включить или отключить (true/false)',
        nullable: true
    })
    state?: boolean

    @IsOptional()
    @IsDate({
        message: 'Поле даты должно быть датой'
    })
    @MinDate(new Date(), {
        message: 'Дата не может быть в прошлом'
    })
    @Field(()=>DateFilterInput, {
        description: 'Дата выполнения задачи',
        nullable: true
    })
    date?: DateFilterInput;

    @IsOptional()
    @Field(()=>Boolean, {
        description: 'Выполненна ли задача',
        nullable: true
    })
    isCompleate?: boolean;

    @IsOptional()
    @IsString({
        message: 'Поле описания должно быть строкой'
    })
    @MaxLength(256, {
        message: 'Максимальная длина описания - 256 символов'
    })
    @Field(()=>StringFilterInput, {
        description: 'Описание задачи',
        nullable: true
    })
    description?: StringFilterInput;
    
    @IsOptional()
    @Field(()=>DateFilterInput, {
        description: 'Дата создания записи',
        nullable: true
    })
    createdAt?: DateFilterInput;

    @IsOptional()
    @Field(()=>DateFilterInput, {
        description: 'Дата обновления записи',
        nullable: true
    })
    updatedAt?: DateFilterInput

    @IsOptional()
    @Field(()=>StringFilterInput, {
        description: 'Имя пользователя, создавшего запись',
        nullable: true
    })
    createdBy?: StringFilterInput

    @IsOptional()
    @Field(()=>StringFilterInput, {
        description: 'Имя пользователя, обновляющего запись',
        nullable: true
    })
    updatedBy?: StringFilterInput
}