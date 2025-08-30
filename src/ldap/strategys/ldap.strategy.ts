import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import Strategy = require("passport-ldapauth");

@Injectable()
export class LdapStrategy extends PassportStrategy(Strategy, "ldap") {
    constructor(
        private readonly configService: ConfigService,
    ) {
        // Конфигурация стратегии LDAP для Passport.js
        super({
            server: {
                // URL сервера LDAP
                url: configService.getOrThrow('LDAP_URL'),
                // DN (Distinguished Name) пользователя для подключения (обычно админ)
                bindDN: configService.getOrThrow('LDAP_ADMIN_LOGIN'),
                // Пароль пользователя для подключения
                bindCredentials: configService.getOrThrow('LDAP_ADMIN_PASSWORD'),
                // Базовый DN, откуда начинается поиск пользователей
                searchBase: configService.getOrThrow('LDAP_DN'),
                // Фильтр поиска пользователя по логину (sAMAccountName)
                searchFilter: '(sAMAccountName={{username}})',
                // Атрибуты, которые будут возвращены из LDAP при поиске пользователя
                searchAttributes: ['sAMAccountName', 'cn', 'distinguishedName'],
                // Опции TLS (отключаем проверку сертификата, если используется self-signed)
                tlsOptions: {
                    rejectUnauthorized: false,
                },
            },
            passReqToCallback: false,
        });
    }

    async validate(playground): Promise<any> {
        // Проверяем, имеет ли пользователь доступ к приложению ограничение на уровне отедла
        if (!playground.distinguishedName.includes(this.configService.getOrThrow('LDAP_ACCESS_FILTER'))) {
            throw new UnauthorizedException(
                `Пользователь ${playground.sAMAccountName} не имеет доступа к приложению. Обратитесь к администратору.`
            );
        }

        return playground;
    }
}