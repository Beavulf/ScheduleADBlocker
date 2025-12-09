import { Field, InputType } from '@nestjs/graphql';
import { TypeTaskEnum } from '@prisma/client';
import { IsOptional } from 'class-validator';

@InputType()
export class ScheduleUpdateInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  fio?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  login?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  endDate?: Date;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  status?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  order?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  isRecall?: boolean;

  @Field(() => TypeTaskEnum, { nullable: true })
  @IsOptional()
  type?: TypeTaskEnum;
}
