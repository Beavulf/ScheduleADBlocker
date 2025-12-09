import {
  Catch,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import { Logger } from 'winston';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientUnknownRequestError,
)
export class PrismaGqlExceptionFilter implements GqlExceptionFilter {
  constructor(@Inject('winston') private readonly logger: Logger) {}

  catch(exception: unknown) {
    // Логируем все исключения через winston
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(
        `Ошибка при работе с БД (PrismaClientKnownRequestError): ${exception.code} - ${exception.message}`,
        { exception },
      );
      switch (exception.code) {
        case 'P2002':
          return new ConflictException('Запись уже существует');
        case 'P2025':
          return new NotFoundException('Запись не найдена');
        case 'P2003':
          return new BadRequestException('Нарушено внешнее ограничение');
        case 'P2000':
          return new BadRequestException('Слишком длинное значение для поля');
        case 'P2011':
          return new BadRequestException('Нарушено ограничение NOT NULL');
        default:
          return exception;
      }
    }
    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(
        `Ошибка при работе с БД (PrismaClientValidationError): ${exception.message}`,
        { exception },
      );
      return new BadRequestException(
        `Невалидные данные запроса ${exception.message}`,
      );
    }
    this.logger.error(
      `Ошибка при работе с БД (Unknown exception in PrismaGqlExceptionFilter): ${exception instanceof Error ? exception.message : exception}`,
      { exception },
    );
    return exception;
  }
}
