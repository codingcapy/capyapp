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

export const imagesRouter = new Hono().post();
