import { Field, InputType } from "@nestjs/graphql";
import { IsOptional } from "class-validator";
import { DateFilterInput } from "../../common/inputs/field-type/date-filter.input";
import { StringFilterInput } from "src/common/inputs/field-type/string-filter.input";

// импут для получение списка задач по условию
@InputType()
export class RecallFilterInput {

    @IsOptional()
    @Field(()=>String, {nullable: true})
    id?: string

    @IsOptional()
    @Field(()=>StringFilterInput, {nullable: true})
    order?: StringFilterInput

    @IsOptional()
    @Field(()=> DateFilterInput, {nullable: true})
    startDate?: DateFilterInput

    @IsOptional()
    @Field(()=> DateFilterInput, {nullable: true})
    endDate?: DateFilterInput

    @IsOptional()
    @Field(()=> StringFilterInput, {nullable: true})
    description?: StringFilterInput

    @IsOptional()
    @Field(()=>DateFilterInput, {nullable: true})
    createdAt?: DateFilterInput

    @IsOptional()
    @Field(()=> StringFilterInput, {nullable: true})
    scheduleId?: StringFilterInput

    @IsOptional()
    @Field(()=> Boolean, {nullable: true})
    status?: boolean

    @IsOptional()
    @Field(()=>DateFilterInput, {nullable: true})
    updatedAt?: DateFilterInput

    @IsOptional()
    @Field(()=>StringFilterInput, {nullable: true})
    createdBy?: StringFilterInput

    @IsOptional()
    @Field(()=>StringFilterInput, {nullable: true})
    updatedBy?: StringFilterInput

}