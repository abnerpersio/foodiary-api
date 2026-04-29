import { Goal } from "@/application/entities/goal";
import { Profile } from "@/application/entities/profile";
import { Injectable } from "@/kernel/decorators/injectable";
import { GoalRepository } from "../repositories/goal-repository";
import { ProfileRepository } from "../repositories/profile-repository";
import { UnitOfWork } from "./unit-of-work";

@Injectable()
export class CreateProfileUnitOfWork extends UnitOfWork {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository,
  ) {
    super();
  }

  async run({ goal, profile }: CreateProfileUnitOfWork.RunParams) {
    this.addPut(this.goalRepository.getPutCommandInput(goal));
    this.addPut(this.profileRepository.getPutCommandInput(profile));
    await this.commit();
  }
}

export namespace CreateProfileUnitOfWork {
  export type RunParams = {
    goal: Goal;
    profile: Profile;
  };
}
