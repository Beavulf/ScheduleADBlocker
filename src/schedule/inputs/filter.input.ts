import { Field, InputType } from "@nestjs/graphql";
import { TypeTaskEnum } from "@prisma/client";
import { IsOptional } from "class-validator";
import { DateFilterInput } from "../../common/inputs/field-type/date-filter.input";
import { StringFilterInput } from "src/common/inputs/field-type/string-filter.input";

// импут для получение списка задач по условию
@InputType()
export class ScheduleFilterInput {

    @Field(()=>StringFilterInput, {nullable: true})
    @IsOptional()
    id?: StringFilterInput

    @Field(()=>StringFilterInput, {nullable: true})
    @IsOptional()
    fio?: StringFilterInput

    @Field(()=>StringFilterInput, {nullable: true})
    @IsOptional()
    login?: StringFilterInput

    @Field(()=> DateFilterInput, {nullable: true})
    @IsOptional()
    startDate?: DateFilterInput

    @Field(()=> DateFilterInput, {nullable: true})
    @IsOptional()
    endDate?: DateFilterInput

    @Field(()=>Boolean, {nullable: true})
    @IsOptional()
    status?: boolean

    @Field(()=>StringFilterInput, {nullable: true})
    @IsOptional()
    order?: StringFilterInput

    @Field(()=>Boolean, {nullable: true})
    @IsOptional()
    isRecall?: boolean

    @Field(()=>TypeTaskEnum, {nullable: true})
    @IsOptional()
    type?: TypeTaskEnum

    @Field(()=>DateFilterInput, {nullable: true})
    @IsOptional()
    createdAt?: DateFilterInput

    @Field(()=>DateFilterInput, {nullable: true})
    @IsOptional()
    updatedAt?: DateFilterInput

    @Field(()=>StringFilterInput, {nullable: true})
    @IsOptional()
    createdBy?: StringFilterInput

    @Field(()=>StringFilterInput, {nullable: true})
    @IsOptional()
    updatedBy?: StringFilterInput

}