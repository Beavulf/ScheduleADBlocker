import { Field, InputType } from '@nestjs/graphql';
import { IsIP, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

@InputType()
export class UpdateInput {
  @IsOptional()
  @MinLength(3, {
    message: 'Наименование должно содержать не менее 3 символов',
  })
  @Field(() => String, {
    description: 'Наименование отдела/ПТО',
    nullable: true,
  })
  name?: string;

  @IsOptional()
  @IsIP('4', {
    message: 'Адрес IP должен быть IPv4',
  })
  @MinLength(5, {
    message: 'Адрес IP должен содержать не менее 5 символов',
  })
  @Field(() => String, {
    description: 'Адрес IP сервера отдела/ПТО',
    nullable: true,
  })
  ipAddress?: string;

  @IsOptional()
  @MinLength(3, {
    message: 'Имя домена должно содержать не менее 3 символов',
  })
  @Field(() => String, {
    description: 'Имя домена сервера отдела/ПТО',
    nullable: true,
  })
  domainName?: string;
}
