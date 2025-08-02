import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DateFilterInput {
  @Field(() => Date, { nullable: true })
  gt?: Date; // больше

  @Field(() => Date, { nullable: true })
  lt?: Date; // меньше

  @Field(() => Date, { nullable: true })
  gte?: Date; // больше или равно

  @Field(() => Date, { nullable: true })
  lte?: Date; // меньше или равно

  @Field(() => Date, { nullable: true })
  eq?: Date; // равно
}