import type { UserModel } from "src/ldap/models/user.model";
import { NotFoundUserToFile } from "../cron-task/not-found-file";
import type { Logger } from "winston";
import type { LdapService } from "src/ldap/ldap.service";

// функция включения или отключения учетки пользователя в АД
export default async function enableOrDisableUser(
    deps: { logger: Logger; ldapService: LdapService },
    task: any,
    status: string, //512(вкл) или 514(выкл)
    isRecall: boolean = false
): Promise<boolean> {
    const { logger, ldapService } = deps;
    let foundUsers: UserModel[];
    const login = isRecall===false ? task.login : task.schedule.login;

    logger.info(`Изменение статуса пользователя ${isRecall ? '(Отзыв) ' : ''}(${status === '512' ? 'ВКЛ.' : 'ВЫКЛ.'}): ${login} по приказу ${task.order ?? '-разовая'}`, { label: 'cron' });

    try {
        // ищем в АД чтобы получить актуальную информацию
        foundUsers = await ldapService.searchLdapUser(login);
    } catch (err) {
        logger.error(
            `Ошибка при поиске пользователя в АД ${isRecall ? '(Отзыв)' : ''} — ${err.message}`,
            { label: 'cron' }
        );
        // записываем в файл людей, которые не обработались
        await NotFoundUserToFile(task.fio, login, `ошибка при поиске в AD ${isRecall ? '(Отзыв)' : ''}`);
        return false;
    }

    if (!foundUsers.length) {
        logger.error(`Пользователь не найден в AD ${isRecall ? '(Отзыв)' : ''}: ${login}`, { label: 'cron' });
        // записываем в файл людей, которые не обработались
        await NotFoundUserToFile(task.fio, login, `не найден в AD ${isRecall ? '(Отзыв)' : ''}`);
        return false;
    }

    if (foundUsers.length>1) {
        logger.error(`Найдено несколько пользователей с логином ${isRecall ? '(Отзыв)' : ''}: ${login}`, { label: 'cron' });
        // записываем в файл людей, которые не обработались
        await NotFoundUserToFile(task.fio, login, `найдено больше 1-го пользователя ${isRecall ? '(Отзыв)' : ''}`);
        return false;
    }

    // получаем DN пользователя из найденной записи
    const { distinguishedName } = foundUsers[0];

    if (!distinguishedName) {
        logger.error(`Отсутствует distinguishedName для пользователя ${isRecall ? '(Отзыв)' : ''}: ${login} - пользователь не будет изменён.`, { label: 'cron' });
        // записываем в файл людей, которые не обработались
        await NotFoundUserToFile(task.fio, login, `отсутствует distinguishedName ${isRecall ? '(Отзыв)' : ''}`);
        return false;
    }

    try {
        // меняем статус пользователя по найденному DN
        await ldapService.enableOrDisableUser(status, { userDn: distinguishedName });
        logger.info(`Пользователь успешно ${status === '512' ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'} ${isRecall ? '(Отзыв)' : ''}: ${login} - ${distinguishedName}`, { label: 'cron' });
        return true;
    } catch (err) {
        // записываем в файл людей, которые не обработались
        await NotFoundUserToFile(task.fio, login, `ошибка изменения статуса в АД ${isRecall ? '(Отзыв)' : ''}`);
        logger.error(
            `Ошибка при изменении статуса пользователя в АД ${isRecall ? '(Отзыв)' : ''}: — ${err.message}`,
            { label: 'cron' }
        );
        return false;
    }
}