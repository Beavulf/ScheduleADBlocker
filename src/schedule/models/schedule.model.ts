import { Field, ObjectType } from "@nestjs/graphql";
import { TypeTaskEnum } from "@prisma/client";

@ObjectType()
export class ScheduleModel {
    @Field(()=>String)
    id: string

    @Field(()=>String)
    fio: string

    @Field(()=>String)
    login: string

    @Field(()=> Date)
    startDate: Date

    @Field(()=> Date)
    endDate: Date

    @Field(()=>Boolean, {nullable: true})
    status?: boolean

    @Field(()=>String)
    order: string

    @Field(()=>Boolean,{nullable: true})
    recall?: boolean

    @Field(()=>TypeTaskEnum)
    type: TypeTaskEnum

    @Field(()=>String, {nullable: true})
    description?: string | null | undefined

    @Field(()=>Date)
    createdAt: Date

    @Field(()=>Date)
    updatedAt: Date

    @Field(()=>String)
    createdBy: string

    @Field(()=>String)
    updatedBy: string

}