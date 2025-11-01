import { Account } from "@/application/entities/account";
import { Goal } from "@/application/entities/goal";
import { Profile } from "@/application/entities/profile";
import { Injectable } from "@/kernel/decorators/injectable";
import { AccountRepository } from "../repositories/account-repository";
import { GoalRepository } from "../repositories/goal-repository";
import { ProfileRepository } from "../repositories/profile-repository";
import { UnitOfWork } from "./unit-of-work";

@Injectable()
export class SignUpUnitOfWork extends UnitOfWork {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository
  ) {
    super();
  }

  async run({ account, goal, profile }: SignUpUnitOfWork.RunParams) {
    this.addPut(this.accountRepository.getPutCommandInput(account));
    this.addPut(this.goalRepository.getPutCommandInput(goal));
    this.addPut(this.profileRepository.getPutCommandInput(profile));
    await this.commit();
  }
}

export namespace SignUpUnitOfWork {
  export type RunParams = {
    account: Account;
    goal: Goal;
    profile: Profile;
  };
}
