import { Field, InputType } from '@nestjs/graphql';
import { IsIP, IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateInput {
  @IsNotEmpty({
    message: 'Поле не может быть пустым',
  })
  @IsString({
    message: 'Наименование должно быть строкой',
  })
  @MinLength(3, {
    message: 'Наименование должно содержать не менее 3 символов',
  })
  @Field(() => String, {
    description: 'Наименование отдела/ПТО',
  })
  name: string;

  @IsNotEmpty({
    message: 'Поле не может быть пустым',
  })
  @IsString({
    message: 'Адрес IP должен быть строкой',
  })
  @IsIP('4', {
    message: 'Адрес IP должен быть IPv4',
  })
  @MinLength(5, {
    message: 'Адрес IP должен содержать не менее 5 символов',
  })
  @Field(() => String, {
    description: 'Адрес IP сервера отдела/ПТО',
  })
  ipAddress: string;

  @IsNotEmpty({
    message: 'Поле не может быть пустым',
  })
  @IsString({
    message: 'Имя домена должно быть строкой',
  })
  @MinLength(3, {
    message: 'Имя домена должно содержать не менее 3 символов',
  })
  @Field(() => String, {
    description: 'Имя домена сервера отдела/ПТО',
  })
  domainName: string;
}
