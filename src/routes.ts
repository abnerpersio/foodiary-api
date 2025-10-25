export type Route = {
  route: string;
  fnPath: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY";
  authorizer?: "jwt";
};

export const ROUTES: Route[] = [
  {
    fnPath: "auth/sign-up",
    method: "POST",
    route: "/sign-up",
  },
  {
    fnPath: "auth/sign-in",
    method: "POST",
    route: "/sign-in",
  },
  {
    fnPath: "meal/create-meal",
    method: "POST",
    route: "/meal",
    authorizer: "jwt",
  },
];
