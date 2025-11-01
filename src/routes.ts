export type Route = {
  route: string;
  fnPath: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY";
  private: boolean;
};

export const ROUTES: Route[] = [
  {
    fnPath: "auth/sign-up",
    method: "POST",
    route: "/sign-up",
    private: false,
  },
  {
    fnPath: "auth/sign-in",
    method: "POST",
    route: "/sign-in",
    private: false,
  },
  {
    fnPath: "auth/refresh-token",
    method: "POST",
    route: "/refresh-token",
    private: false,
  },
  {
    fnPath: "auth/forgot-password",
    method: "POST",
    route: "/forgot-password",
    private: false,
  },
  {
    fnPath: "auth/reset-password",
    method: "POST",
    route: "/reset-password",
    private: false,
  },
  {
    fnPath: "accounts/get-me",
    method: "POST",
    route: "/me",
    private: true,
  },
  {
    fnPath: "meals/create-meal",
    method: "POST",
    route: "/meals",
    private: true,
  },
  {
    fnPath: "meals/list-meals-by-date",
    method: "GET",
    route: "/meals",
    private: true,
  },
  {
    fnPath: "meals/get-meal",
    method: "GET",
    route: "/meals/:mealId",
    private: true,
  },
  {
    fnPath: "profiles/update-profile",
    method: "PUT",
    route: "/profile",
    private: true,
  },
  {
    fnPath: "goals/update-goal",
    method: "PUT",
    route: "/goals",
    private: true,
  },
];
