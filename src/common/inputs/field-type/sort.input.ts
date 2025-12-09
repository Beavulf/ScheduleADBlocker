import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class FieldSortInput {
  @Field(() => String)
  field: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  order: 'asc' | 'desc';
}
