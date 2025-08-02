import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsDate, IsOptional, IsString, MaxLength, MinDate, MinLength } from "class-validator";

@InputType()
export class OneTimeUpdateInput {

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
    @Field(()=>String, {
        description: 'ФИО пользователя',
        nullable: true
    })
    fio?: string;

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
    @Field(()=>String, {
        description: 'Логин пользователя',
        nullable: true
    })
    login?: string;

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
    @Field(()=>Date, {
        description: 'Дата выполнения задачи',
        nullable: true
    })
    date?: Date;

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
    @Field(()=>String, {
        description: 'Описание задачи',
        nullable: true
    })
    description?: string;
}