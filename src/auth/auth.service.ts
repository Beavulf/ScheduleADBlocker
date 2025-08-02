import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { isDev } from 'src/utils/is-dev.utils';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ){}

    async logout(res: Response) {
        this.setCookies(res, '', new Date(0))
        return true
    }

    async refreshToken(res: Response, req: Request) {
        const refreshToken = req.cookies['refreshToken']

        if (!refreshToken) {
            this.logout(res)
            throw new UnauthorizedException('Пользователь не авторизован или устарел токен обновления')
        }

        const {username} = await this.jwtService.verifyAsync(refreshToken)

        if (username) {
            return this.auth(res, username)
        }
    }

    async auth(res: Response, username:string) {
        const {accessToken, refreshToken} = await this.generateToken(username)

        this.setCookies(res, refreshToken, new Date(Date.now() + 1000 * 60 * 60 * 24 * 7))

        return {accessToken}
    }

    async generateToken(username:string) {

        const accessToken = this.jwtService.sign({username}, {
            expiresIn: this.configService.getOrThrow('JWT_ACCESS_TOKEN_TTL')
        });

        const refreshToken = this.jwtService.sign({username}, {
            expiresIn: this.configService.getOrThrow('JWT_REFRESH_TOKEN_TTL')
        });

        return {
            accessToken,
            refreshToken
        }
    }
    
    private setCookies(res: Response, value: string, expires: Date) {
        res.cookie('refreshToken', value, {
            httpOnly: true,
            expires,
            secure: !isDev(this.configService),
            sameSite: 'lax',
        })
    }
}

