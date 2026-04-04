import { Meal } from "@/application/entities/meal";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { MINUTE } from "@/shared/utils/time";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import KSUID from "ksuid";
import { s3Client } from "../clients/s3";

@Injectable()
export class MealsFileStorageGateway {
  constructor(private readonly appConfig: AppConfig) {}

  static generateFileKey({
    accountId,
    inputType,
  }: MealsFileStorageGateway.GenerateFileKeyParams): string {
    const extension = inputType === Meal.InputType.AUDIO ? "m4a" : "jpeg";
    const filename = `${KSUID.randomSync().string}.${extension}`;
    return `${accountId}/${filename}`;
  }

  async createPOST({
    file,
    accountId,
    mealId,
  }: MealsFileStorageGateway.CreatePostParams): Promise<MealsFileStorageGateway.CreatePostResult> {
    const bucket = this.appConfig.storage.mealsBucket;
    const fileType =
      file.inputType === Meal.InputType.AUDIO ? "audio/m4a" : "image/jpeg";

    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: bucket,
      Key: file.key,
      Expires: 5 * MINUTE,
      Conditions: [
        { bucket },
        ["eq", "$key", file.key],
        ["eq", "$Content-Type", fileType],
        ["content-length-range", file.size, file.size],
      ],
      Fields: {
        "x-amz-meta-accountid": accountId,
        "x-amz-meta-mealid": mealId,
      },
    });

    const uploadSignature = Buffer.from(
      JSON.stringify({
        url,
        fields: {
          ...fields,
          "Content-Type": fileType,
        },
      }),
    ).toString("base64");

    return { uploadSignature };
  }

  getFileURL(fileKey: string) {
    return `https://${this.appConfig.cdn.mealsCdnDomainName}/${fileKey}`;
  }
}

export namespace MealsFileStorageGateway {
  export type GenerateFileKeyParams = {
    accountId: string;
    inputType: Meal.InputType;
  };

  export type CreatePostParams = {
    file: {
      inputType: Meal.InputType;
      key: string;
      size: number;
    };
    accountId: string;
    mealId: string;
  };

  export type CreatePostResult = {
    uploadSignature: string;
  };
}
