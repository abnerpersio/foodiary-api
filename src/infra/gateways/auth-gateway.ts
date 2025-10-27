import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import {
  AdminCreateUserCommand,
  AdminLinkProviderForUserCommand,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  GetTokensFromRefreshTokenCommand,
  InitiateAuthCommand,
  ListUsersCommand,
  SignUpCommand,
  UserNotFoundException,
  type UserType,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "node:crypto";
import { cognitoClient } from "../clients/cognito";

@Injectable()
export class AuthGateway {
  constructor(private readonly appConfig: AppConfig) {}

  async signUp({
    internalId,
    email,
    password,
  }: AuthGateway.SignUpParams): Promise<AuthGateway.SignUpResult> {
    const command = new SignUpCommand({
      ClientId: this.appConfig.auth.cognito.clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "custom:internalId", Value: internalId },
        { Name: "email", Value: email },
      ],
      SecretHash: this.getSecretHash(email),
    });

    const { UserSub: externalId } = await cognitoClient.send(command);

    if (!externalId) {
      throw new Error(`Cannot sign up user: ${email}`);
    }

    return { externalId };
  }

  async signIn({
    email,
    password,
  }: AuthGateway.SignInParams): Promise<AuthGateway.SignInResult> {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: this.appConfig.auth.cognito.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: this.getSecretHash(email),
      },
    });

    const { AuthenticationResult: result } = await cognitoClient.send(command);

    if (!result?.AccessToken || !result?.RefreshToken) {
      throw new Error("Cannot sign in");
    }

    return {
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken,
    };
  }

  async refreshToken({
    refreshToken,
  }: AuthGateway.RefreshTokenParams): Promise<AuthGateway.RefreshTokenResult> {
    const command = new GetTokensFromRefreshTokenCommand({
      ClientId: this.appConfig.auth.cognito.clientId,
      ClientSecret: this.appConfig.auth.cognito.clientSecret,
      RefreshToken: refreshToken,
    });

    const { AuthenticationResult: result } = await cognitoClient.send(command);

    if (!result?.AccessToken || !result?.RefreshToken) {
      throw new Error("Cannot refresh token");
    }

    return {
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken,
    };
  }

  async forgotPassword({ email }: AuthGateway.ForgotPasswordParams) {
    const command = new ForgotPasswordCommand({
      ClientId: this.appConfig.auth.cognito.clientId,
      Username: email,
      SecretHash: this.getSecretHash(email),
    });

    await cognitoClient.send(command);
  }

  async resetPassword({
    email,
    code,
    password,
  }: AuthGateway.ResetPasswordParams) {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: this.appConfig.auth.cognito.clientId,
      Username: email,
      ConfirmationCode: code,
      Password: password,
      SecretHash: this.getSecretHash(email),
    });

    await cognitoClient.send(command);
  }

  async createUser({
    internalId,
    userPoolId,
    email,
    firstName,
    lastName,
    profileImage,
  }: AuthGateway.CreateUserParams): Promise<AuthGateway.CreateUserResult> {
    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      MessageAction: "SUPPRESS",
      UserAttributes: [
        { Name: "custom:internalId", Value: internalId },
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:profileImage", Value: profileImage || undefined },
      ],
    });

    const { User: user } = await cognitoClient.send(command);

    if (!user) {
      throw new Error("Failed while trying to create the native user.");
    }

    return { user };
  }

  async getUserByEmail({
    email,
    userPoolId,
  }: AuthGateway.GetUserByEmailParams): Promise<AuthGateway.GetUserByEmailResult> {
    let paginationToken: string | undefined;
    let user: UserType | undefined;

    do {
      const command = new ListUsersCommand({
        UserPoolId: userPoolId,
        AttributesToGet: ["sub"],
        Filter: `email = "${email}"`,
        Limit: 1,
        PaginationToken: paginationToken,
      });

      const { PaginationToken: nextPaginationToken, Users: users = [] } =
        await cognitoClient.send(command);

      paginationToken = nextPaginationToken;

      if (users[0]) {
        user = users[0];
        break;
      }
    } while (paginationToken);

    return { user };
  }

  async linkProvider({
    userPoolId,
    nativeUserId,
    providerName,
    providerUserId,
  }: AuthGateway.LinkProviderParams) {
    const command = new AdminLinkProviderForUserCommand({
      UserPoolId: userPoolId,
      DestinationUser: {
        ProviderName: "Cognito",
        ProviderAttributeValue: nativeUserId,
      },
      SourceUser: {
        ProviderName: providerName,
        ProviderAttributeValue: providerUserId,
        ProviderAttributeName: "Cognito_Subject",
      },
    });

    await cognitoClient.send(command);
  }

  private getSecretHash(email: string) {
    return createHmac("SHA256", this.appConfig.auth.cognito.clientSecret)
      .update(`${email}${this.appConfig.auth.cognito.clientId}`)
      .digest("base64");
  }

  // private parseRoles(
  //   claims?: Record<string, string | number | boolean | string[]>
  // ) {
  //   if (!claims) return [Role.user];

  //   try {
  //     const roles = (claims["cognito:groups"] as string)
  //       .slice(1, -1)
  //       .split(",")
  //       .map((s) => s.trim());
  //     if (!roles) return [Role.user];
  //     return roles;
  //   } catch {
  //     return [Role.user];
  //   }
  // }
}

export namespace AuthGateway {
  export type SignUpParams = {
    internalId: string;
    email: string;
    password: string;
  };

  export type SignUpResult = {
    externalId: string;
  };

  export type SignInParams = {
    email: string;
    password: string;
  };

  export type SignInResult = {
    accessToken: string;
    refreshToken: string;
  };

  export type RefreshTokenParams = {
    refreshToken: string;
  };

  export type RefreshTokenResult = {
    accessToken: string;
    refreshToken: string;
  };

  export type ForgotPasswordParams = {
    email: string;
  };

  export type ResetPasswordParams = {
    email: string;
    code: string;
    password: string;
  };

  export type CreateUserParams = {
    internalId: string;
    userPoolId: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };

  export type CreateUserResult = {
    user: UserType;
  };

  export type GetUserByEmailParams = {
    userPoolId: string;
    email: string;
  };

  export type GetUserByEmailResult = {
    user: UserType | undefined;
  };

  export type LinkProviderParams = {
    userPoolId: string;
    nativeUserId: string;
    providerName: string;
    providerUserId: string;
  };
}
