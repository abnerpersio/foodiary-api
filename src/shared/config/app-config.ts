import { Injectable } from "@/kernel/decorators/injectable";
import { Env } from "./env";

@Injectable()
export class AppConfig {
  readonly auth: AppConfig.Auth;
  readonly db: AppConfig.Database;
  readonly storage: AppConfig.Storage;
  readonly cdn: AppConfig.CDN;

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

    this.cdn = {
      mealsCdnDomainName: Env.mealsCdnDomainName,
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

  export type CDN = {
    mealsCdnDomainName: string;
  };
}
