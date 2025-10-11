import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { isDev } from "src/utils/is-dev.utils";

export async function getGraphQlConfig(configService: ConfigService): Promise<ApolloDriverConfig> {
  return {
    driver: ApolloDriver,
    autoSchemaFile: join(process.cwd(), "src/schema.gql"),
    sortSchema: true,
    playground: isDev(configService),

    context: ({ req, res }) => {
      // 👇 сохраняем твою авторизацию через контекст
      if (
        req.body &&
        req.body.operationName === "Auth" &&
        req.body.variables &&
        req.body.variables.data
      ) {
        req.body.username = req.body.variables.data.username;
        req.body.password = req.body.variables.data.password;
      }
      return { req, res };
    },

    // 👇 новый блок — форматируем GraphQL ошибки
    formatError: (error) => {
      const original = error.extensions?.originalError as any;
      const message = Array.isArray(original?.message)
        ? original.message.join(", ")
        : original?.message || error.message;

      return {
        message,
        code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
        statusCode: original?.statusCode || 500,
      };
    },
  };
}
