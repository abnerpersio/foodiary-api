import { Injectable } from "@/kernel/decorators/injectable";
import { Env } from "./env";

@Injectable()
export class AppConfig {
  readonly auth: AppConfig.Auth;
  readonly db: AppConfig.Database;
  readonly storage: AppConfig.Storage;

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

    this.storage = {
      mealsBucket: Env.mealsBucketName,
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

  export type Storage = {
    mealsBucket: string;
  };
}
