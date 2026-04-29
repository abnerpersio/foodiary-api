import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { MINUTE } from "@/shared/utils/time";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import KSUID from "ksuid";
import { s3Client } from "../clients/s3";

@Injectable()
export class AccountFileStorageGateway {
  constructor(private readonly appConfig: AppConfig) {}

  generateFileKey(accountId: string): string {
    return `profile-pictures/${accountId}/${KSUID.randomSync().string}.jpeg`;
  }

  async createPOST({
    key,
    accountId,
  }: AccountFileStorageGateway.CreatePostParams): Promise<AccountFileStorageGateway.CreatePostResult> {
    const bucket = this.appConfig.storage.mealsBucket;

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

  getFileURL(key: string): string {
    return `https://${this.appConfig.cdns.mealsCdnDomainName}/${key}`;
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
