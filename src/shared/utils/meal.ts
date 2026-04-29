import { Meal } from "@/application/entities/meal";

const PROTEINS_MULTIPLIER = 4;
const CARBOHYDRATES_MULTIPLIER = 4;
const FATS_MULTIPLIER = 9;

export const getFoodCalories = (
  food: Pick<Meal.Food, "proteins" | "carbohydrates" | "fats">,
): Meal.Food["calories"] => {
  const proteinsCalories = food.proteins * PROTEINS_MULTIPLIER;
  const carbohydratesCalories = food.carbohydrates * CARBOHYDRATES_MULTIPLIER;
  const fatsCalories = food.fats * FATS_MULTIPLIER;
  const calories = Math.round(
    proteinsCalories + carbohydratesCalories + fatsCalories,
  );

  return {
    proteins: proteinsCalories,
    carbohydrates: carbohydratesCalories,
    fats: fatsCalories,
    total: calories,
  };
};
