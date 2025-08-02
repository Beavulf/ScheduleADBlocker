import { Field, ObjectType } from "@nestjs/graphql";
import { IsOptional } from "class-validator";
import { DateFilterInput } from "../../common/inputs/field-type/date-filter.input";
import { StringFilterInput } from "src/common/inputs/field-type/string-filter.input";

// импут для получение списка задач по условию
@ObjectType()
export class RecallGetModel {

    @Field(()=>String)
    id: string

    @Field(()=>String)
    order: string

    @Field(()=> Date)
    startDate: Date

    @Field(()=> Date)
    endDate: Date

    @Field(()=> String, {
        nullable: true
    })
    description?:string | null

    @Field(()=>Date)
    createdAt: Date

    @Field(()=>String )
    scheduleId: string

    @Field(()=> Boolean)
    status: boolean

    @Field(()=>Date)
    updatedAt: Date

    @Field(()=>String)
    createdBy: string

    @Field(()=>String)
    updatedBy: string

}