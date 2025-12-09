import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class StringFilterInput {
  @Field(() => String, { nullable: true }) equals?: string;
  @Field(() => String, { nullable: true }) contains?: string;
  @Field(() => String, { nullable: true }) startsWith?: string;
  @Field(() => String, { nullable: true }) endsWith?: string;
  @Field(() => [String], { nullable: true }) in?: string[];
}
