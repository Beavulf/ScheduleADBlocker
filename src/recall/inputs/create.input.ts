import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsDate, IsNotEmpty, IsOptional, IsString, MaxLength, MinDate, MinLength } from "class-validator";

@InputType()
export class RecallCreateInput {

    @IsNotEmpty({
        message: 'Поле номера приказа не может быть пустым'
    })
    @IsString({
        message: 'Поле номера приказа должно быть строкой'
    })
    @MinLength(3, {
        message: 'Минимальная длина номера приказа - 3 символа'
    })
    @MaxLength(20, {
        message: 'Максимальная длина номера приказа - 20 символов'
    })
    @Field(()=>String, {
        description: 'Номер приказа'
    })
    order: string;

    @IsNotEmpty({
        message: 'Поле даты начала не может быть пустым'
    })
    @IsDate({
        message: 'Поле даты начала должно быть датой'
    })
    @Field(()=>Date, {
        description: 'Дата начала отзыва'
    })
    startDate: Date;

    @IsNotEmpty({
        message: 'Поле даты окончания не может быть пустым'
    })
    @IsDate({
        message: 'Поле даты окончания должно быть датой'
    })
    @Field(()=>Date, {
        description: 'Дата окончания отзыва'
    })
    endDate: Date;
    
    @IsOptional()
    @IsString({
        message: 'Поле описания должно быть строкой'
    })
    @MinLength(6, {
        message: 'Минимальная длина описания - 6 символов'
    })
    @MaxLength(256, {
        message: 'Максимальная длина описания - 256 символов'
    })
    @Field(()=>String, {
        description: 'Описание/примечание к отзыву',
        nullable: true
    })
    description?: string;

    @IsOptional()
    @IsBoolean({
        message: 'Поле статуса должно быть булевым значением'
    })
    @Field(()=>Boolean, {
        description: 'Статус отзыва (активен/неактивен)',
        nullable: true
    })
    status?: boolean;

}