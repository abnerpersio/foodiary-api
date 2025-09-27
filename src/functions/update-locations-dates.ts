import { UpdateLocationsDatesUseCase } from "@/domain/update-locations-dates-use-case";
import { httpAdapt } from "@/infra/adapters/http";

export const handler = httpAdapt(
  {
    method: "POST",
    route: "/infra/locations/process-dates",
  },
  new UpdateLocationsDatesUseCase()
);
