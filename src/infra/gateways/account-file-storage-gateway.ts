import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { MINUTE } from "@/shared/utils/time";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import KSUID from "ksuid";
import { s3Client } from "../clients/s3";

const EXPIRATION_IN_SECONDS = 60 * 60;

@Injectable()
export class AccountFileStorageGateway {
  constructor(private readonly appConfig: AppConfig) {}

  generateFileKey(accountId: string): string {
    return `${accountId}/${KSUID.randomSync().string}.jpeg`;
  }

  async createPOST({
    key,
    accountId,
  }: AccountFileStorageGateway.CreatePostParams): Promise<AccountFileStorageGateway.CreatePostResult> {
    const bucket = this.appConfig.storage.accountsBucket;

    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: bucket,
      Key: key,
      Expires: 5 * MINUTE,
      Conditions: [
        { bucket },
        ["eq", "$key", key],
        ["eq", "$Content-Type", "image/jpeg"],
        ["content-length-range", 1, 5 * 1024 * 1024],
      ],
      Fields: {
        "x-amz-meta-accountid": accountId,
      },
    });

    const uploadSignature = Buffer.from(
      JSON.stringify({
        url,
        fields: {
          ...fields,
          "Content-Type": "image/jpeg",
        },
      }),
    ).toString("base64");

    return { uploadSignature };
  }

  async getFileURL(key: string): Promise<string> {
    const bucket = this.appConfig.storage.accountsBucket;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client as any, command, {
      expiresIn: EXPIRATION_IN_SECONDS,
    });

    return url;
  }
}

export namespace AccountFileStorageGateway {
  export type CreatePostParams = {
    key: string;
    accountId: string;
  };

  export type CreatePostResult = {
    uploadSignature: string;
  };
}
