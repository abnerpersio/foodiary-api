import { Injectable } from "@/kernel/decorators/injectable";
import { Env } from "./env";

@Injectable()
export class AppConfig {
  readonly auth: AppConfig.Auth;
  readonly db: AppConfig.Database;

  constructor() {
    this.auth = {
      cognito: {
        clientId: Env.cognitoClientId,
        clientSecret: Env.cognitoClientSecret,
        poolId: Env.cognitoPoolId,
      },
    };

    this.db = {
      dynamodb: {
        mainTable: Env.mainTableName,
      },
    };
  }
}

export namespace AppConfig {
  export type Auth = {
    cognito: {
      clientId: string;
      clientSecret: string;
      poolId: string;
    };
  };

  export type Database = {
    dynamodb: {
      mainTable: string;
    };
  };
}
