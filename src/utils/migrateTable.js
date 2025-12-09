/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require('@prisma/client');
const sql = require('mssql');
const { Client } = require('ldapts');

// --- НАСТРОЙКИ ---
// Укажите данные для подключения к MSSQL
const mssqlConfig = {
  user: 'buchar',
  password: 'Gjnjvexnjvjue1~',
  server: 'localhost', // или IP-адрес сервера
  database: 'ADToolDB',
  options: {
    encrypt: false, // установите true, если используете Azure SQL или требуется шифрование
    trustServerCertificate: true, // установите true, если у вас самоподписанный сертификат
  },
};

// Укажите данные для подключения к Active Directory (LDAP)
// Аналогично настройкам в LdapService
const ldapConfig = {
  url: process.env.LDAP_URL, // process.env.LDAP_URL
  bindDN: process.env.LDAP_ADMIN_LOGIN, // process.env.LDAP_ADMIN_LOGIN
  bindCredentials: process.env.LDAP_ADMIN_PASSWORD, // process.env.LDAP_ADMIN_PASSWORD
  searchBase: process.env.LDAP_DN, // process.env.LDAP_DN
};

const ENUM_TYPE = {
    "Декрет": 'DEKRET',
    "Соц.отпуск.": 'SOC_OTPYSK',
    "Учеба": 'UCHEBA',
    "Отпуск": 'OTPYSK',
    "Стажировка": 'STAJIROVKA',
    "Продление отп.": 'PRODLENIE_OTPYSKA',
    "Командировка": 'KOMANDIROVKA',
}

// Название исходной таблицы в MSSQL
const sourceTableName = 'UserToChange';

// Размер пакета для обработки записей
const BATCH_SIZE = 100;
// --- КОНЕЦ НАСТРОЕК ---

const prisma = new PrismaClient();

/**
 * Создаёт и возвращает LDAP-клиент ldapts, выполняя bind под учётными данными администратора.
 * @returns {Promise<Client>} Промис с авторизованным LDAP-клиентом ldapts.
 */
async function createAndBindLdaptsClient() {
    const client = new Client({
        url: ldapConfig.url,
        timeout: 30000,
        connectTimeout: 30000,
    });

    console.log('Попытка соединения к АД...');

    try {
        await client.bind(ldapConfig.bindDN, ldapConfig.bindCredentials);
        console.log('Подключение к АД успешно выполнено.');
    } catch (err) {
        const errMsg = `Ошибка при подключении к АД - ${err.message}.`;
        console.error(errMsg);
        throw new Error(errMsg);
    }

    return client;
}

/**
 * Ищет логин пользователя в Active Directory по ФИО, используя логику из LdapService.
 * @param {Client} client - Авторизованный клиент ldapts.
 * @param {string} fio - ФИО пользователя для поиска.
 * @returns {Promise<string|null>} - Логин (sAMAccountName) или null, если не найден.
 */
async function getLoginFromAD(client, fio) {
    try {
        // Строковый фильтр, аналогичный логике в LdapService
        const filter = `(&(objectCategory=person)(objectClass=user)(|(cn=*${fio}*)(sAMAccountName=*${fio}*)))`;
        const opts = {
            filter: filter,
            scope: 'sub',
            attributes: ['sAMAccountName'],
            sizeLimit: 1,
        };

        const { searchEntries } = await client.search(ldapConfig.searchBase, opts);

        if (searchEntries.length > 0 && searchEntries[0].sAMAccountName) {
            return searchEntries[0].sAMAccountName;
        }

        return null;
    } catch (err) {
        console.warn(`Ошибка при поиске в AD для ФИО "${fio}": ${err.message}`);
        // Не прерываем процесс, просто возвращаем null
        return null;
    }
}

/**
 * Проверяет, существует ли уже запись в PostgreSQL
 * @param {object} record - Запись из MSSQL
 * @returns {Promise<boolean>} - true, если дубликат найден
 */
async function checkDuplicate(record, login) {
  const existing = await prisma.schedule.findFirst({
    where: {
      order: record.prikaz,
      startDate: new Date(record.date_s),
      login: login,
    },
  });
  return !!existing;
}

async function main() {
  console.log('Начало миграции данных из MSSQL в PostgreSQL...');
  let ldapClient;

  try {
    // 1. Подключение к сервисам
    await sql.connect(mssqlConfig);
    console.log('Успешно подключились к MSSQL.');
    ldapClient = await createAndBindLdaptsClient();

    // 2. Получение данных из MSSQL
    const result = await sql.query(`SELECT * FROM ${sourceTableName}`);
    const records = result.recordset;
    console.log(`Найдено ${records.length} записей в исходной таблице.`);

    if (records.length === 0) {
      console.log('Нет данных для миграции.');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let processedCount = 0;
    const recordsToCreate = [];

    // 3. Трансформация и подготовка данных
    for (const record of records) {
      processedCount++;
      // Выводим прогресс в той же строке консоли
      process.stdout.write(`\rОбработка записи: ${processedCount} / ${records.length}`);

      // Ищем логин в AD по ФИО
      const login = await getLoginFromAD(ldapClient, record.fio);
      if (!login) {
        //   console.warn(`[ПРЕДУПРЕЖДЕНИЕ] Логин для "${record.fio}" не найден в AD. Будет использована заглушка 'not_found_in_ad'.`);
      }
      const finalLogin = login || 'not_found_in_ad';

      // Проверяем на дубликаты перед добавлением в пакет
      const isDuplicate = await checkDuplicate(record, finalLogin);
      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      recordsToCreate.push({
        // id генерируется Prisma автоматически (UUID)
        fio: record.fio,
        login: finalLogin,
        startDate: new Date(record.date_s),
        endDate: new Date(record.date_p),
        order: record.prikaz,
        status: false,
        isRecall: record.otozvan || false, // По умолчанию false
        type: ENUM_TYPE[record.descrip],
        description: `Мигрировано из ${sourceTableName}`,
        createdAt: new Date(record.date_z),
        updatedAt: new Date(), // Устанавливаем текущую дату как дату обновления
        createdBy: record.who.split('\\')[1],
        updatedBy: record.who.split('\\')[1],
      });

      // 4. Вставка пакетами в PostgreSQL
      if (recordsToCreate.length >= BATCH_SIZE) {
        const created = await prisma.schedule.createMany({ data: recordsToCreate });
        migratedCount += created.count;
        console.log(`Вставлено ${created.count} записей...`);
        recordsToCreate.length = 0; // Очищаем массив
      }
    }

    // Вставка оставшихся записей
    if (recordsToCreate.length > 0) {
      const created = await prisma.schedule.createMany({ data: recordsToCreate });
      migratedCount += created.count;
    }

    // Перевод строки после завершения прогресс-бара
    console.log(); 

    console.log('--- Итоги миграции ---');
    console.log(`Всего обработано: ${records.length}`);
    console.log(`Успешно перенесено: ${migratedCount}`);
    console.log(`Пропущено (дубликаты): ${skippedCount}`);
    console.log('Миграция успешно завершена!');
  } catch (err) {
    console.error('Произошла ошибка во время миграции:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    if (ldapClient) {
        await ldapClient.unbind();
    }
    await sql.close();
  }
}

main();