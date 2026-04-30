import { Profile } from "@/application/entities/profile";
import { AccountItem } from "./account-item";

export class ProfileItem {
  static readonly type = "Profile";
  private readonly keys: ProfileItem.Keys;

  constructor(private readonly attrs: ProfileItem.Attributes) {
    this.keys = {
      PK: ProfileItem.getPK(this.attrs),
      SK: ProfileItem.getSK(this.attrs),
    };
  }

  toItem(): ProfileItem.ItemType {
    return {
      type: ProfileItem.type,
      ...this.keys,
      ...this.attrs,
    };
  }

  static fromEntity(profile: Profile) {
    return new ProfileItem({
      ...profile,
      profileImageKey: profile.profileImageKey,
      birthDate: profile.birthDate.toISOString(),
      createdAt: profile.createdAt.toISOString(),
    });
  }

  static toEntity(profileItem: ProfileItem.ItemType) {
    return new Profile({
      ...profileItem,
      profileImageKey: profileItem.profileImageKey ?? null,
      birthDate: new Date(profileItem.birthDate),
      createdAt: new Date(profileItem.createdAt),
    });
  }

  static getPK(
    attrs: Pick<ProfileItem.Attributes, "accountId">,
  ): ProfileItem.Keys["PK"] {
    return `ACCOUNT#${attrs.accountId}`;
  }

  static getSK(
    attrs: Pick<ProfileItem.Attributes, "accountId">,
  ): ProfileItem.Keys["SK"] {
    return `ACCOUNT#${attrs.accountId}#PROFILE`;
  }
}

export namespace ProfileItem {
  export type Keys = {
    PK: AccountItem.Keys["PK"];
    SK: `ACCOUNT#${string}#PROFILE`;
  };

  export type Attributes = {
    accountId: string;
    name: string;
    birthDate: string;
    gender: Profile.Gender;
    height: number;
    weight: number;
    activityLevel: Profile.ActivityLevel;
    goal: Profile.Goal;
    profileImageKey: string | null;
    createdAt: string;
  };

  export type ItemType = Keys & Attributes & { type: "Profile" };
}
