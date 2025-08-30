import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CronTaskInfoModel {

  @Field(()=> Boolean)
  isActive: boolean;

  @Field(() => String)
  source: string;

  @Field(() => String)
  sendAt: string;

  @Field(() => String)
  getTimeout: string;

  @Field(() => Date, {
    nullable: true,
  })
  nextDate?: Date | null;

  @Field(() => Date, {
    nullable: true,
  })
  lastDate?: Date | null;
}