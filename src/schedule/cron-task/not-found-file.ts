import { InternalServerErrorException } from "@nestjs/common";

export async function NotFoundUserToFile(fio: string, login: string, description?: string) {
    const fs = require('fs').promises;
    const path = require('path');

    // Формируем путь к файлу с учетом текущей даты (YYYY-MM-DD)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const fileName = `not-found-in-ad-${year}-${month}-${day}.txt`;
    const notFoundFilePath = path.resolve(__dirname, process.env.LOGGER_NOTFOUND_USER_PATH, fileName);

    // Добавляем запись в файл (fio, login, описание) новой строкой; оборачиваем ошибки в InternalServerErrorException
    try {
        await fs.appendFile(
            notFoundFilePath,
            `${fio} - ${login} (${description || ''}) \n`,
            { encoding: 'utf8' }
        );
    } catch (error) {
        console.warn(`Не удалось записать в not-found-in-ad: ${error.message}`);
    }
}