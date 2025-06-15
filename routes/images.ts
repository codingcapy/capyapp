import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { db } from "../db";
import { messages as messagesTable } from "../schemas/messages";
import { images as imagesTable } from "../schemas/images";
import { mightFail } from "might-fail";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

const s3Client = new S3Client({
  region: process.env.AWS_IMAGE_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_FILE_TYPES = ["jpeg", "jpg", "png", "gif", "webp", "svg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type UploadResponse =
  | {
      success: true;
      cloudFrontUrl: string;
    }
  | {
      success: false;
      error: string;
    };

export const imagesRouter = new Hono()
  .post(
    "/upload",
    zValidator(
      "form",
      z.object({
        userId: z.string(),
        file: z.instanceof(File),
      })
    ),
    async (c) => {
      const { file, userId } = c.req.valid("form");
      try {
        // Validate file type
        const fileType = file.type;
        const extension = fileType.split("/")[1];
        if (!ALLOWED_FILE_TYPES.includes(extension)) {
          return c.json<UploadResponse>(
            {
              success: false,
              error: "Invalid file type",
            },
            400
          );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          return c.json<UploadResponse>(
            {
              success: false,
              error: "File too large",
            },
            400
          );
        }

        // Use timestamp in the key itself for time-versioned images
        // Enables to avoid the cache (CloudFront) when image is updated
        const timestamp = Date.now();
        const env = process.env.NODE_ENV || "dev";
        const key = `${env}/images/${file.name}-${timestamp}.${extension}`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(process.env.AWS_IMAGE_BUCKET_NAME);
        // Upload to S3
        const putObjectCommand = new PutObjectCommand({
          Bucket: process.env.AWS_IMAGE_BUCKET_NAME!,
          Key: key,
          Body: buffer,
          ContentType: fileType,
        });

        await s3Client.send(putObjectCommand);

        // "Generate" CloudFront URL
        const cloudFrontUrl = `${process.env.AWS_CLOUDFRONT_URL}/${key}`;

        // Update the shape with the CloudFront URL
        await db
          .insert(imagesTable)
          .values({ imageUrl: cloudFrontUrl, userId: userId });
        return c.json<UploadResponse>({
          success: true,
          cloudFrontUrl,
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        return c.json<UploadResponse>(
          {
            success: false,
            error: "Failed to upload file",
          },
          500
        );
      }
    }
  )
  .get("/:chatId", async (c) => {
    const chatId = c.req.param("chatId");
    if (!chatId) {
      return c.json({ error: "chatId parameter is required." }, 400);
    }
    const { result: imagesQueryResult, error: imagesQueryError } =
      await mightFail(
        db
          .select()
          .from(imagesTable)
          .where(eq(imagesTable.chatId, Number(chatId)))
      );
    if (imagesQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching images",
        cause: imagesQueryError,
      });
    }
    return c.json({ images: imagesQueryResult });
  })
  .get("/", async (c) => {
    const { result: imagesQueryResult, error: imagesQueryError } =
      await mightFail(db.select().from(imagesTable));
    if (imagesQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching images",
        cause: imagesQueryError,
      });
    }
    return c.json({ images: imagesQueryResult });
  });
