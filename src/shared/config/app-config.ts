import { Injectable } from "@/kernel/decorators/injectable";
import { Env } from "./env";

@Injectable()
export class AppConfig {
  readonly auth: AppConfig.Auth;
  readonly db: AppConfig.Database;
  readonly storage: AppConfig.Storage;
  readonly cdns: AppConfig.CDNs;
  readonly queues: AppConfig.Queues;

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

    this.cdns = {
      mealsCdnDomainName: Env.mealsCdnDomainName,
    };

    this.queues = {
      mealsQueueUrl: Env.mealsQueueUrl,
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

  export type CDNs = {
    mealsCdnDomainName: string;
  };

  export type Queues = {
    mealsQueueUrl: string;
  };
}
