import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsDate, IsNotEmpty, IsOptional, IsString, MaxLength, MinDate, MinLength } from "class-validator";

@InputType()
export class OneTimeCreateInput {

    @IsNotEmpty({
        message: 'Поле ФИО не может быть пустым'
    })
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
        description: 'ФИО пользователя'
    })
    fio: string;

    @IsNotEmpty({
        message: 'Поле логина не может быть пустым'
    })
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
        description: 'Логин пользователя'
    })
    login: string;

    @IsBoolean()
    @Field(()=>Boolean, {
        description: 'Что сделать с пользователем - включить или отключить (true/false)'
    })
    state: boolean

    @IsNotEmpty({
        message: 'Поле даты не может быть пустым'
    })
    @IsDate({
        message: 'Поле даты должно быть датой'
    })
    @MinDate(new Date(), {
        message: 'Дата не может быть в прошлом'
    })
    @Field(()=>Date, {
        description: 'Дата выполнения задачи'
    })
    date: Date;

    @IsOptional()
    @Field(()=>Boolean, {
        description: 'Выполненна ли задача',
        nullable: true
    })
    isCompleate?: boolean;

    @IsString({
        message: 'Поле описания должно быть строкой'
    })
    @IsOptional()
    @MaxLength(256, {
        message: 'Максимальная длина описания - 256 символов'
    })
    @Field(()=>String, {
        description: 'Описание задачи',
        nullable: true
    })
    description?: string;
}