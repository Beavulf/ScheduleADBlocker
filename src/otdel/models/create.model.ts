import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CreateModel {

    @Field(()=>String, {
        description: 'ID отдела/ПТО'
    })
    id: string

    @Field(()=>String,{
        description: 'Наименование отдела/ПТО'
    })
    name: string;

    @Field(()=>String, {
        description: 'Адрес IP сервера отдела/ПТО'
    })
    ipAddress: string;

    @Field(()=>String, {
        description: 'Имя домена сервера отдела/ПТО'
    })
    domainName: string;

    @Field(()=>String, {
        description: 'Имя создателя записи'
    })
    createdBy: string;

    @Field(()=>String, {
        description: 'Имя изменившего запись',
    })
    updatedBy: string;
}