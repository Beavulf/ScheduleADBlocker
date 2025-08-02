import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

@InputType()
export class ModifyInput {
    @IsNotEmpty()    
    @IsString({
        message: 'Должно быть строкой'
    })
    @MinLength(3, {
        message: 'Минимальная длинна 3 символа'
    })
    @MaxLength(156, {
        message: 'Максимальная длинна 156 символов'
    })
    @Field(()=>String,{
        description: 'Путь до пользователя в АД'
    })
    userDn: string
}