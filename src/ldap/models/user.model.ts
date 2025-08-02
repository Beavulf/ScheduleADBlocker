import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class UserModel {

    @Field(()=>String,{
        nullable: true
    })
    cn?: string

    @Field(()=>String, {
        nullable: true
    })
    distinguishedName?: string
    
    @Field(()=>String, {
        nullable: true
    })
    sAMAccountName?: string

    @Field(()=>String, {
        nullable: true
    })
    title?: string

    @Field(()=>String, {
        nullable: true
    })
    department?: string

    @Field(()=>String, {
        nullable: true
    })
    company?: string

    @Field(()=>String, {
        nullable: true
    })
    description?: string

    @Field(()=>String, {
        nullable: true
    })
    userAccountControl?: string

    @Field(()=>String, {
        nullable: true
    })
    memberOf?: string

    @Field(()=>String, {
        nullable: true
    })
    logonHours?: string
}