import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

@InputType()
export class LoginInput {
    @IsNotEmpty({
        message: 'Логин не может быть пустым'
    })
    @IsString({
        message: 'Логин должен быть строкой'
    })
    @MinLength(3, {
        message: 'Логин должен содержать не менее 3 символов'
    })
    @Field(()=>String)
    username: string;


    @IsNotEmpty({
        message: 'Пароль не может быть пустым'
    })
    @IsString({
        message: 'Пароль должен быть строкой'
    })
    @MinLength(4, {
        message: 'Пароль должен содержать не менее 4 символов'
    })
    @Field(()=>String)
    password: string;
}