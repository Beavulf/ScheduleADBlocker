import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ldap from 'ldapjs'
import { Logger } from 'winston';
import type { UserModel } from './models/user.model';
import type { ModifyInput } from './inputs/modify.input';

const attributes = [
    'cn', //ФИО
    'distinguishedName', //путь в АД
    'sAMAccountName', //логин
    'title', //должность
    'department', //отдел
    'company', //таможня
    'description', //описание
    'memberOf', //в каких 
    'userAccountControl', //включена или отключена
    'logonHours' //часы входа
]
// опции для поиска всех пользователей
// const optsAllUsers: ldap.SearchOptions = {
//     filter: '(objectClass=user)',
//     scope: 'sub',
//     attributes
// }


@Injectable()
export class LdapService {

    private readonly LDAP_URL : string;
    private readonly LDAP_DN : string;
    private readonly LDAP_ADMIN_LOGIN : string;
    private readonly LDAP_ADMIN_PASSWORD : string;


    constructor (
        private readonly configService: ConfigService,
        @Inject('winston') private readonly logger: Logger
    ) {
        this.LDAP_URL = this.configService.getOrThrow('LDAP_URL')
        this.LDAP_DN = this.configService.getOrThrow('LDAP_DN')
        this.LDAP_ADMIN_LOGIN = this.configService.getOrThrow('LDAP_ADMIN_LOGIN')
        this.LDAP_ADMIN_PASSWORD = this.configService.getOrThrow('LDAP_ADMIN_PASSWORD')
    }

    // получение опции для поиска пользователя по свпаденю Cn (fio) или логина
    /**
     * Формирует опции поиска для LDAP по совпадению ФИО (cn) или логина (sAMAccountName).
     * Используется для поиска пользователей в Active Directory.
     * @param value - строка для поиска (ФИО или логин)
     * @returns Опции поиска для ldapjs
     */
    getOptsByCn(value: string): ldap.SearchOptions {
        const opts: ldap.SearchOptions = {
            // Фильтр ищет пользователей, у которых cn или sAMAccountName содержит value
            filter: `(|(cn=*${value}*)(sAMAccountName=*${value}*))`,
            scope: 'sub', // Поиск по всем вложенным объектам в базе DN
            attributes // Список атрибутов, которые будут возвращены
        }

        return opts;
    }

    // создание клиента под данными "админа"
    /**
     * Создаёт и возвращает LDAP-клиент, предварительно выполняя bind под учётными данными администратора.
     * Логирует попытку подключения и результат. В случае ошибки выбрасывает исключение.
     * @returns {Promise<ldap.Client>} Промис с авторизованным LDAP-клиентом
     * @throws {ConflictException} В случае ошибки подключения или авторизации
     */
    async createAndBindLdapClient(): Promise<ldap.Client> {
        // Создаём новый экземпляр LDAP-клиента с заданными таймаутами
        const client = ldap.createClient({
            url: this.LDAP_URL,
            timeout: 5000,
            connectTimeout: 5000,
        });

        this.logger.info('Попытка соединения к АД.');

        // Выполняем bind (аутентификацию) под учётными данными администратора
        await new Promise((resolve, reject) => {
            client.bind(
                this.LDAP_ADMIN_LOGIN,
                this.LDAP_ADMIN_PASSWORD,
                (err) => {
                    if (err) {
                        this.logger.error(`Ошибка при подключении к АД - ${err.message}.`);
                        reject(new ConflictException(`Ошибка при подключении к АД: ${err.message}`));
                        return;
                    }
                    this.logger.info('Подключение к АД успешно выполнено.');
                    resolve('connected');
                }
            );
        });

        // Возвращаем авторизованный клиент
        return client;
    }

    // получение списка пользователей найденых по переданному параметру
    /**
     * Выполняет поиск пользователей в LDAP по cn или sAMAccountName.
     * Возвращает массив пользователей, соответствующих критериям поиска.
     * 
     * @param client - авторизованный LDAP-клиент
     * @param cnOrSamaccountname - строка поиска (cn или sAMAccountName)
     * @returns Promise<UserModel[]> - массив найденных пользователей
     */
    private async getUsers(client: ldap.Client, cnOrSamaccountname: string): Promise<UserModel[]> {
        return new Promise((resolve, reject) => {
            const users: UserModel[] = [];

            // Инициируем поиск в LDAP по заданному DN и параметрам поиска
            client.search(
                this.LDAP_DN, // DN, в котором выполняется поиск
                this.getOptsByCn(cnOrSamaccountname), // параметры поиска (фильтр, атрибуты и т.д.)
                (err, res) => {
                    if (err) {
                        // В случае ошибки поиска закрываем соединение и возвращаем ошибку
                        client.unbind();
                        this.logger.info(`Ошибка при поиске пользователя - ${cnOrSamaccountname} (${err.message})`);
                        reject(new ConflictException(`Ошибка при поиске пользователя - ${err.message}`));
                        return;
                    }

                    // Обработка каждой найденной записи пользователя
                    res.on('searchEntry', (entry) => {
                        // Формируем объект пользователя, извлекая только нужные атрибуты
                        const user = attributes.reduce((acc, field) => {
                            acc[field] = entry.attributes.find(item => item.type === field)?.values[0] as string;
                            return acc;
                        }, {} as UserModel);

                        users.push(user);
                    });

                    // Обработка ошибок, возникших во время поиска
                    res.on('error', (err) => {
                        client.unbind();
                        this.logger.error(`Ошибка поиска LDAP: ${err.message}`);
                        reject(new ConflictException(`Ошибка поиска LDAP: ${err.message}`));
                    });

                    // Завершение поиска: закрываем соединение и возвращаем найденных пользователей
                    res.on('end', (result) => {
                        client.unbind();
                        this.logger.info(`Поиск окончен (${result?.status}) - закрытие соединения. Возвращено записей ${users.length}.`);
                        resolve(users);
                    });
                }
            );
        });
    }

    // поиск пользователя и получение найденного списка
    async searchLdapUser(cnOrSamaccountname:string):Promise<UserModel[]> {
        const client = await this.createAndBindLdapClient()

        this.logger.info(`Попытка поиска пользователя - ${cnOrSamaccountname}`)

        const users: UserModel[] = await this.getUsers(client, cnOrSamaccountname)
        
        return users;
    }

    // получение опции для модифицирования пользователя (отключение-514/включение-512)
    private getChangeUserAccountControl(state: string): ldap.Change {
        const change = new ldap.Change({
            operation: 'replace',
            modification: new ldap.Attribute({
                type: 'userAccountControl',
                values: [state]
            })
        })
        
        return change;
    }

    // изменения записи пользователя по distinguishedName (CN=Tsyhanokm, DN=Users, DN=corp, DN=local)
    /**
     * Модифицирует атрибут userAccountControl для пользователя в LDAP.
     * Используется для включения (512) или отключения (514) пользователя.
     * @param client - экземпляр LDAP клиента с активным соединением
     * @param state - новое значение userAccountControl (например, '512' или '514')
     * @param userDn - объект с DN пользователя (ModifyInput)
     * @returns Promise<void> - успешно завершится при удачной модификации, либо выбросит исключение при ошибке
     */
    private async modifyUser(client: ldap.Client, state: string, userDn: ModifyInput): Promise<void> {
        return new Promise((resolve, reject) => {
            this.logger.info(`Попытка изменения статуса пользователя - ${userDn.userDn}.`);
            client.modify(
                userDn.userDn,
                this.getChangeUserAccountControl(state), 
                (err) => {
                    if (err) {
                        // Логируем и пробрасываем ошибку, если изменение не удалось
                        this.logger.error(`Ошибка при изменении пользователя - ${err.message}.`);
                        reject(new ConflictException(`Ошибка при изменении пользователя - ${err.message}.`));
                    } else {
                        // Логируем успешное изменение статуса пользователя
                        this.logger.info(`Пользователь ${userDn.userDn} успешно изменен на статус ${state}.`);
                        resolve();
                    }
                }
            );
        });
    }

    // включение или отключение пользователя 514 off 512 on
    async enableOrDisableUser(state: string, userDn: ModifyInput): Promise<boolean> {
        const client = await this.createAndBindLdapClient();
        try {
            await this.modifyUser(client, state, userDn);
            return true;
        } finally {
            client.unbind();
        }
    }

    // ******************************РАБОТА С ЧАСАМИ ДОСТУПА**********************************
    private parseLogonHours(logonHoursBuffer: Buffer): {
        allowedHours: boolean[][];
        isAllowed: (day: number, hour: number) => boolean;
    } {
        const hours = new Array(7).fill(null).map(() => new Array(24).fill(false));
        
        // Парсим каждый бит
        for (let byteIndex = 0; byteIndex < 21; byteIndex++) {
            const byte = logonHoursBuffer[byteIndex];
            for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
                const globalBitIndex = byteIndex * 8 + bitIndex;
                const day = Math.floor(globalBitIndex / 24);
                const hour = globalBitIndex % 24;
                
                if (day < 7 && hour < 24) {
                    hours[day][hour] = (byte & (1 << bitIndex)) !== 0;
                }
            }
        }
        
        return {
            allowedHours: hours,
            isAllowed: (day: number, hour: number) => hours[day]?.[hour] || false
        };
    }

    // Получение человекочитаемого расписания
    getHumanReadableSchedule(logonHoursBuffer: Buffer): string {
        const { allowedHours } = this.parseLogonHours(logonHoursBuffer);
        const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        
        return allowedHours.map((dayHours, dayIndex) => {
            const allowedRanges = this.getTimeRanges(dayHours);
            return `${days[dayIndex]}: ${allowedRanges.join(', ') || 'запрещено'}`;
        }).join('\n');
    }

    private getTimeRanges(hours: boolean[]): string[] {
        const ranges: string[] = [];
        let start: number | null = null;
        
        for (let i = 0; i < 24; i++) {
            if (hours[i] && start === null) {
                start = i;
            } else if (!hours[i] && start !== null) {
                ranges.push(`${start}:00-${i}:00`);
                start = null;
            }
        }
        
        if (start !== null) {
            ranges.push(`${start}:00-24:00`);
        }
        
        return ranges;
    }
}
