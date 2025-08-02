import { Field, InputType } from "@nestjs/graphql";
import { TypeTaskEnum } from "@prisma/client";

@InputType()
export class EnumFilterInput {
  @Field(() => TypeTaskEnum, { nullable: true }) eq?: TypeTaskEnum;
  @Field(() => [TypeTaskEnum], { nullable: true }) in?: TypeTaskEnum[];
}