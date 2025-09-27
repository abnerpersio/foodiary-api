// import {
//   AdminCreateUserCommand,
//   AdminLinkProviderForUserCommand,
//   CognitoIdentityProviderClient,
//   ListUsersCommand,
//   type UserType,
// } from '@aws-sdk/client-cognito-identity-provider';

// export const cognitoClient = new CognitoIdentityProviderClient();

// type CreateUserParams = {
//   userPoolId: string;
//   email: string;
//   firstName: string;
//   lastName: string;
//   profileImage: string | null;
// };

// type GetUserByEmailParams = {
//   userPoolId: string;
//   email: string;
// };

// type LinkProviderParams = {
//   userPoolId: string;
//   nativeUserId: string;
//   providerName: string;
//   providerUserId: string;
// };

// export class Cognito {
//   static async createUser({ userPoolId, email, firstName, lastName, profileImage }: CreateUserParams) {
//     const command = new AdminCreateUserCommand({
//       UserPoolId: userPoolId,
//       Username: email,
//       MessageAction: 'SUPPRESS',
//       UserAttributes: [
//         { Name: 'given_name', Value: firstName },
//         { Name: 'family_name', Value: lastName },
//         { Name: 'email', Value: email },
//         { Name: 'email_verified', Value: 'true' },
//         { Name: 'custom:profileImage', Value: profileImage || undefined },
//       ],
//     });

//     const { User } = await cognitoClient.send(command);

//     if (!User) {
//       throw new Error('Failed while trying to create the native user.');
//     }

//     return User;
//   }

//   static async getUserByEmail({ email, userPoolId }: GetUserByEmailParams) {
//     let paginationToken: string | undefined;
//     let user: UserType | undefined;

//     do {
//       const command = new ListUsersCommand({
//         UserPoolId: userPoolId,
//         AttributesToGet: ['sub'],
//         Filter: `email = "${email}"`,
//         Limit: 1,
//         PaginationToken: paginationToken,
//       });

//       const { PaginationToken: nextPaginationToken, Users: users = [] } = await cognitoClient.send(command);

//       paginationToken = nextPaginationToken;

//       if (users[0]) {
//         user = users[0];
//         break;
//       }
//     } while (paginationToken);

//     return user as UserType | undefined;
//   }

//   static async linkProvider({ userPoolId, nativeUserId, providerName, providerUserId }: LinkProviderParams) {
//     const command = new AdminLinkProviderForUserCommand({
//       UserPoolId: userPoolId,
//       DestinationUser: {
//         ProviderName: 'Cognito',
//         ProviderAttributeValue: nativeUserId,
//       },
//       SourceUser: {
//         ProviderName: providerName,
//         ProviderAttributeValue: providerUserId,
//         ProviderAttributeName: 'Cognito_Subject',
//       },
//     });

//     await cognitoClient.send(command);
//   }
// }
