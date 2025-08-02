import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import Strategy = require("passport-ldapauth");

@Injectable()
export class LdapStrategy extends PassportStrategy(Strategy, "ldap") {
    constructor(
        private readonly configService: ConfigService,
    ) {
        super({
            server: {
                url: configService.getOrThrow('LDAP_URL'),
                bindDN: configService.getOrThrow('LDAP_ADMIN_LOGIN'),
                bindCredentials: configService.getOrThrow('LDAP_ADMIN_PASSWORD'),
                searchBase: configService.getOrThrow('LDAP_DN'),
                searchFilter: '(sAMAccountName={{username}})',
                searchAttributes: ['sAMAccountName', 'cn'],
                tlsOptions: {
                    rejectUnauthorized: false,
                },
              },
              passReqToCallback: false,
              
        });
    }

    async validate(playground): Promise<any> {
        return playground;
    }
}