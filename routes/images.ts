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
import { createInsertSchema } from "drizzle-zod";

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

const deleteImageSchema = z.object({
  imageId: z.number(),
});

export const imagesRouter = new Hono()
  .post(
    "/upload",
    zValidator(
      "form",
      z.object({
        userId: z.string(),
        chatId: z.string(),
        messageId: z.string(),
        file: z.instanceof(File),
      })
    ),
    async (c) => {
      const { file, userId, chatId, messageId } = c.req.valid("form");
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
        await db.insert(imagesTable).values({
          imageUrl: cloudFrontUrl,
          userId: userId,
          messageId: Number(messageId),
          chatId: Number(chatId),
        });
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
    console.log("get images");
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
    console.log(imagesQueryResult);
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
  })
  .post("/delete", zValidator("json", deleteImageSchema), async (c) => {
    const deleteValues = c.req.valid("json");
    const { error: imageDeleteError, result: imageDeleteResult } =
      await mightFail(
        db
          .delete(imagesTable)
          .where(eq(imagesTable.imageId, Number(deleteValues.imageId)))
          .returning()
      );
    if (imageDeleteError) {
      console.log("Error while deleting image");
      throw new HTTPException(500, {
        message: "Error while deleting image",
        cause: imageDeleteError,
      });
    } else {
      deleteImageFromS3(imageDeleteResult[0].imageUrl);
    }
    return c.json({ newImage: imageDeleteResult[0] }, 200);
  })
  .post(
    "/update",
    zValidator(
      "json",
      createInsertSchema(imagesTable).omit({
        chatId: true,
        userId: true,
        imageUrl: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const updateValues = c.req.valid("json");
      const { error: imageUpdateError, result: imageUpdateResult } =
        await mightFail(
          db
            .update(imagesTable)
            .set({ messageId: updateValues.messageId, posted: true })
            .where(eq(imagesTable.imageId, Number(updateValues.imageId)))
            .returning()
        );
      if (imageUpdateError) {
        console.log("Error while updating image");
        throw new HTTPException(500, {
          message: "Error while updating image",
          cause: imageUpdateResult,
        });
      }
      return c.json({ newMessage: imageUpdateResult[0] }, 200);
    }
  );

export async function deleteImageFromS3(imageUrl: string) {
  if (!imageUrl) return;
  const cloudFrontBase = process.env.AWS_CLOUDFRONT_URL!;
  const key = imageUrl.replace(`${cloudFrontBase}/`, ""); // remove base URL
  const deleteCommand = new DeleteObjectsCommand({
    Bucket: process.env.AWS_IMAGE_BUCKET_NAME!,
    Delete: {
      Objects: [{ Key: key }],
    },
  });
  try {
    await s3Client.send(deleteCommand);
    console.log(`Deleted image from S3: ${key}`);
  } catch (err) {
    console.error("Failed to delete image from S3", err);
  }
}
