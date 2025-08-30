import { ConfigService } from "@nestjs/config";
import { type JwtModuleOptions } from "@nestjs/jwt";

export async function getJwtConfig(configService: ConfigService): Promise<JwtModuleOptions> {
    
    // Возвращаем объект конфигурации для JwtModule
    return {
        // Секретный ключ для подписи и проверки JWT, берём из переменных окружения через ConfigService
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
            // Алгоритм подписи токена
            algorithm: 'HS256'
        },
        verifyOptions: {
            // Разрешённые алгоритмы для проверки подписи токена
            algorithms: ['HS256'],
            // Не игнорировать истечение срока действия токена
            ignoreExpiration: false,
        }
    }
}