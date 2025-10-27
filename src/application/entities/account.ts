import KSUID from "ksuid";

export class Account {
  readonly id: string;
  readonly email: string;
  readonly createdAt: Date;

  externalId: string | undefined;

  constructor(attr: Account.Attributes) {
    this.id = attr.id ?? KSUID.randomSync().string;
    this.email = attr.email;
    this.externalId = attr.externalId;
    this.createdAt = attr.createdAt ?? new Date();
  }
}

export namespace Account {
  export type Attributes = {
    id?: string;
    createdAt?: Date;
    email: string;
    externalId?: string;
  };
}
