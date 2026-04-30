import { Account } from "@/application/entities/account";

export class AccountItem {
  static readonly type = "Account";
  private readonly keys: AccountItem.Keys;

  constructor(private readonly attrs: AccountItem.Attributes) {
    this.keys = {
      PK: AccountItem.getPK(this.attrs),
      SK: AccountItem.getSK(this.attrs),
      GSI1PK: AccountItem.getGSI1PK(this.attrs),
      GSI1SK: AccountItem.getGSI1SK(this.attrs),
    };
  }

  toItem(): AccountItem.ItemType {
    return {
      type: AccountItem.type,
      ...this.keys,
      ...this.attrs,
    };
  }

  static fromEntity(account: Account) {
    return new AccountItem({
      ...account,
      createdAt: account.createdAt.toISOString(),
    });
  }

  static toEntity(accountItem: AccountItem.ItemType) {
    return new Account({
      ...accountItem,
      createdAt: new Date(accountItem.createdAt),
    });
  }

  static getPK(
    attrs: Pick<AccountItem.Attributes, "id">,
  ): AccountItem.Keys["PK"] {
    return `ACCOUNT#${attrs.id}`;
  }

  static getSK(
    attrs: Pick<AccountItem.Attributes, "id">,
  ): AccountItem.Keys["SK"] {
    return `ACCOUNT#${attrs.id}`;
  }

  static getGSI1PK(
    attrs: Pick<AccountItem.Attributes, "email">,
  ): AccountItem.Keys["GSI1PK"] {
    return `ACCOUNT#${attrs.email}`;
  }

  static getGSI1SK(
    attrs: Pick<AccountItem.Attributes, "email">,
  ): AccountItem.Keys["GSI1SK"] {
    return `ACCOUNT#${attrs.email}`;
  }
}

export namespace AccountItem {
  export type Keys = {
    PK: `ACCOUNT#${string}`;
    SK: `ACCOUNT#${string}`;
    GSI1PK: `ACCOUNT#${string}`;
    GSI1SK: `ACCOUNT#${string}`;
  };

  export type Attributes = {
    email: string;
    id: string;
    externalId: string | undefined;
    createdAt: string;
  };

  export type ItemType = Keys & Attributes & { type: "Account" };
}
