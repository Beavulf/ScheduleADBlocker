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
    getOptsByCn(value: string): ldap.SearchOptions {
        const opts: ldap.SearchOptions = {
            filter: `(|(cn=*${value}*)(sAMAccountName=*${value}*))`,
            scope: 'sub',
            attributes
        }

        return opts
    }

    // создание клиента под данными "админа"
    async createAndBindLdapClient(): Promise<ldap.Client> {
        const client = ldap.createClient({
            url: this.LDAP_URL,
            timeout: 5000,
            connectTimeout: 5000,
        })

        this.logger.info(`Попытка соединения к АД.`)

        // подключение к домену АД через данные пользователя (администратора/системная учетка)
        await new Promise((resolve, reject) => {
            client.bind(
                this.LDAP_ADMIN_LOGIN, 
                this.LDAP_ADMIN_PASSWORD, 
                (err) => {
                    if (err) {
                        this.logger.error(`Ошибка при подключении к АД - ${err.message}.`)
                        reject(new ConflictException(`Ошибка при подключении ${err.message}`)) 
                    }
                    this.logger.info('Подключение к АД успешно выполнено.')
                    resolve('connected')
                }
            );
        });     

        return client
    }

    // получение списка пользователей найденых по переданному параметру
    async getUsers (client: ldap.Client, cnOrSamaccountname: string):Promise<UserModel[]> {
        return new Promise((resolve, reject) => {
            const users: UserModel[] = []
            client.search(
                this.LDAP_DN, //где искать в АД
                this.getOptsByCn(cnOrSamaccountname), //по каким параметрам искать
                (err, res) => {
                    if (err) {
                        client.unbind()
                        this.logger.info(`Ошибка при поиске пользователя - ${cnOrSamaccountname} (${err.message})`)
                        reject(new ConflictException(`Ошибка при поиске пользователя - ${err.message}`))
                    }

                    res.on('searchEntry', (entry) => {
                        const user = attributes.reduce((acc,field)=>{
                            acc[field] = entry.attributes.find(item=>item.type===field)?.values[0] as string
                            return acc
                        }, {} as UserModel) 

                        users.push(user)
                    });

                    res.on('error', (err) => {
                        client.unbind();
                        this.logger.error(`Ошибка поиска LDAP: ${err.message}`);
                        reject(new ConflictException(`Ошибка поиска LDAP: ${err.message}`));
                    });

                    res.on('end', (result) => {
                        client.unbind(); // закрываем соединение
                        this.logger.info(`Поиск окончен (${result?.status}) - закрытие соеденения. Возвращено записей ${users.length}.`)
                        resolve(users)
                    });
                }
            )
        })
    }

    // поиск пользователя и получение найденного списка
    async searchLdapUser(cnOrSamaccountname:string):Promise<UserModel[]> {
        const client = await this.createAndBindLdapClient()

        this.logger.info(`Попытка поиска пользователя - ${cnOrSamaccountname}`)

        const users: UserModel[] = await this.getUsers(client, cnOrSamaccountname)
        
        return users
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
        
        return change
    }

    // изменения записи пользователя по distinguishedName (CN=Tsyhanokm, DN=Users, DN=corp, DN=local)
    private async modifyUser(client: ldap.Client, state: string, userDn: ModifyInput): Promise<void> {
        return new Promise((resolve, reject) => {
            this.logger.info(`Попытка изменения статуса пользователя - ${userDn.userDn}.`);
            client.modify(
                userDn.userDn,
                this.getChangeUserAccountControl(state), 
                (err) => {
                    if (err) {
                        this.logger.error(`Ошибка при изменении пользователя - ${err.message}.`);
                        reject(new ConflictException(`Ошибка при изменении пользователя - ${err.message}.`));
                    } else {
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


    // /**
    //  * Генерирует Buffer для logonHours: разрешено с 9:00 до 18:00 (9 часов) по будням (Пн-Пт)
    //  * Active Directory: 21 байт (168 бит), каждый бит — 1 час, начиная с воскресенья 00:00
    //  */
    // private generateLogonHoursBuffer(): Buffer {
    //     const hours = new Array(168).fill(0); // 7 дней * 24 часа
    //     // Пн=1, Вт=2, Ср=3, Чт=4, Пт=5 (AD: 0=вс, 1=пн, ...)
    //     for (let day = 1; day <= 5; day++) {
    //         for (let hour = 9; hour < 18; hour++) {
    //             hours[day * 24 + hour] = 1;
    //         }
    //     }
    //     // Преобразуем массив битов в Buffer (21 байт)
    //     const bytes: number[] = [];
    //     for (let i = 0; i < 21; i++) {
    //         let byte = 0;
    //         for (let bit = 0; bit < 8; bit++) {
    //             if (hours[i * 8 + bit]) {
    //                 byte |= 1 << bit;
    //             }
    //         }
    //         bytes.push(byte);
    //     }
    //     return Buffer.from(bytes);
    // }

    // /**
    //  * Устанавливает logonHours для пользователя (разрешено с 9 до 18 по будням)
    //  * @param userDn DN пользователя (строка или объект с userDn)
    //  */
    // async setUserLogonHours(userDn: string | ModifyInput): Promise<boolean> {
    //     const dn = typeof userDn === 'string' ? userDn : userDn.userDn;
    //     const client = await this.createAndBindLdapClient();
    //     const logonHoursBuffer = this.generateLogonHoursBuffer();
    //     return new Promise((resolve, reject) => {
    //         this.logger.info(`Установка logonHours для пользователя ${dn}`);
    //         const change = new ldap.Change({
    //             operation: 'replace',
    //             modification: new ldap.Attribute({
    //                 type: 'logonHours',
    //                 values: [logonHoursBuffer]
    //             })
    //         });
    //         client.modify(dn, change, (err) => {
    //             client.unbind();
    //             if (err) {
    //                 this.logger.error(`Ошибка при установке logonHours: ${err.message}`);
    //                 reject(new ConflictException(`Ошибка при установке logonHours: ${err.message}`));
    //             } else {
    //                 this.logger.info(`logonHours успешно установлен для ${dn}`);
    //                 resolve(true);
    //             }
    //         });
    //     });
    // }
}
