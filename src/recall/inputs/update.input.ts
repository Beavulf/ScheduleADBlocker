import { Field, InputType } from "@nestjs/graphql";
import { IsOptional } from "class-validator";

@InputType()
export class RecallUpdateInput {

    @Field(()=>String, {
        description: 'Номер приказа',
        nullable: true
    })
    @IsOptional()
    order?: string;

    @Field(()=>Date, {
        description: 'Дата начала отзыва',
        nullable: true
    })
    @IsOptional()
    startDate?: Date;

    @Field(()=>Date, {
        description: 'Дата окончания отзыва',
        nullable: true
    })
    @IsOptional()
    endDate?: Date;

    @Field(()=>String, {
        description: 'Описание/примечание к отзыву',
        nullable: true
    })
    @IsOptional()
    description?: string;

    @Field(()=>Boolean, {
        description: 'Статус отзыва (активен/неактивен)',
        nullable: true
    })
    @IsOptional()
    status?: boolean;

}