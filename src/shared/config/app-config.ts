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
        poolDomain: Env.cognitoPoolDomain,
      },
    };

    this.db = {
      dynamodb: {
        mainTable: Env.mainTableName,
      },
    };

    this.storage = {
      mealsBucket: Env.mealsBucketName,
      accountsBucket: Env.accountsBucketName,
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
      poolDomain: string;
    };
  };

  export type Database = {
    dynamodb: {
      mainTable: string;
    };
  };

  export type Storage = {
    mealsBucket: string;
    accountsBucket: string;
  };

  export type CDNs = {
    mealsCdnDomainName: string;
  };

  export type Queues = {
    mealsQueueUrl: string;
  };
}
