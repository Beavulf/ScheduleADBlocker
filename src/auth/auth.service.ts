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

    /**
     * Выход пользователя из системы.
     * Очищает refreshToken cookie, устанавливая её значение в пустую строку и истёкшую дату.
     * @param res - объект ответа Express
     * @returns true, если операция успешна
     */
    async logout(res: Response): Promise<boolean> {
        this.setCookies(res, 'refreshToken', new Date(0)); // Удаляем refreshToken cookie
        return true;
    }

    /**
     * Обновление accessToken пользователя по refreshToken из cookie.
     * Проверяет наличие и валидность refreshToken, если токен отсутствует или невалиден — выбрасывает ошибку.
     * В случае успеха выдает новый accessToken и обновляет refreshToken в cookie.
     * @param res - объект ответа Express
     * @param req - объект запроса Express
     * @throws UnauthorizedException если refreshToken отсутствует или невалиден
     * @returns объект с новым accessToken
     */
    async refreshToken(res: Response, req: Request) {
        // Получаем refreshToken из cookie
        const refreshToken = req.cookies['refreshToken'];

        // Если refreshToken отсутствует — удаляем cookie и выбрасываем ошибку
        if (!refreshToken) {
            await this.logout(res);
            throw new UnauthorizedException('Пользователь не авторизован или устарел токен обновления');
        }

        // Проверяем валидность refreshToken и извлекаем username
        const { username } = await this.jwtService.verifyAsync(refreshToken);

        // Если username найден — выдаём новые токены
        if (username) {
            return this.auth(res, username);
        }
    }

    /**
     * Аутентификация пользователя: генерирует новые accessToken и refreshToken,
     * устанавливает refreshToken в httpOnly cookie, возвращает accessToken клиенту.
     * @param res - объект ответа Express
     * @param username - имя пользователя для генерации токенов
     * @returns объект с accessToken
     */
    async auth(res: Response, username: string) {
        // Генерируем accessToken и refreshToken для пользователя
        const { accessToken, refreshToken } = await this.generateToken(username);

        // Устанавливаем refreshToken в httpOnly cookie с истечением через 7 дней
        this.setCookies(res, refreshToken, new Date(Date.now() + 1000 * 60 * 60 * 24 * 7));

        // Возвращаем только accessToken клиенту
        return { accessToken };
    }

    /**
     * Генерирует пару токенов (accessToken и refreshToken) для указанного пользователя.
     * accessToken используется для авторизации запросов, refreshToken — для обновления accessToken.
     * @param username - имя пользователя, для которого создаются токены
     * @returns объект с accessToken и refreshToken
     */
    private async generateToken(username: string) {
        // Генерируем accessToken с коротким сроком действия
        const accessToken = this.jwtService.sign(
            { username },
            {
                expiresIn: this.configService.getOrThrow('JWT_ACCESS_TOKEN_TTL'),
            }
        );

        // Генерируем refreshToken с более длительным сроком действия
        const refreshToken = this.jwtService.sign(
            { username },
            {
                expiresIn: this.configService.getOrThrow('JWT_REFRESH_TOKEN_TTL'),
            }
        );

        // Возвращаем оба токена
        return {
            accessToken,
            refreshToken,
        };
    }
    
    /**
     * Устанавливает refreshToken в httpOnly cookie.
     * @param res - объект ответа Express
     * @param value - значение refreshToken
     * @param expires - дата истечения срока действия cookie
     */
    private setCookies(res: Response, value: string, expires: Date) {
        res.cookie('refreshToken', value, {
            httpOnly: true, // cookie недоступна через JS (только сервер)
            expires,        // срок действия cookie
            secure: !isDev(this.configService), // только по HTTPS вне dev-режима
            sameSite: 'lax', // защита от CSRF-атак
        });
    }
}

