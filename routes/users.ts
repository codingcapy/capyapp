import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { users as usersTable } from "../schemas/users";
import { mightFail } from "might-fail";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import nodemailer from "nodemailer";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export const usersRouter = new Hono()
  .post(
    "/",
    zValidator(
      "json",
      createInsertSchema(usersTable).omit({
        userId: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const insertValues = c.req.valid("json");
      const { error: emailQueryError, result: emailQueryResult } =
        await mightFail(
          db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, insertValues.email))
        );
      if (emailQueryError) {
        throw new HTTPException(500, {
          message: "Error while fetching user",
          cause: emailQueryResult,
        });
      }
      if (emailQueryResult.length > 0) {
        return c.json(
          { message: "An account with this email already exists" },
          409
        );
      }
      const encrypted = await hashPassword(insertValues.password);
      const userId = randomUUIDv7();
      const { error: userInsertError, result: userInsertResult } =
        await mightFail(
          db
            .insert(usersTable)
            .values({
              userId: userId,
              username: insertValues.username,
              email: insertValues.email,
              password: encrypted,
            })
            .returning()
        );
      if (userInsertError) {
        console.log("Error while creating user");
        throw new HTTPException(500, {
          message: "Error while creating user",
          cause: userInsertResult,
        });
      }
      return c.json({ user: userInsertResult[0] }, 200);
    }
  )
  .get(async (c) => {
    const { error: usersQueryError, result: usersQueryResult } =
      await mightFail(db.select().from(usersTable));
    if (usersQueryError) {
      throw new HTTPException(500, {
        message: "Error while fetching users",
        cause: usersQueryError,
      });
    }
    return c.json({ users: usersQueryResult }, 200);
  })
  .post(
    "/update/profilepic",
    zValidator(
      "json",
      createInsertSchema(usersTable).omit({
        username: true,
        email: true,
        password: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const updateValues = c.req.valid("json");
      const { error: queryError, result: newUserResult } = await mightFail(
        db
          .update(usersTable)
          .set({ ...updateValues })
          .where(eq(usersTable.userId, updateValues.userId))
          .returning()
      );
      if (queryError) {
        throw new HTTPException(500, {
          message: "Error updating users table",
          cause: queryError,
        });
      }
      return c.json({ newUser: newUserResult[0] }, 200);
    }
  )
  .post(
    "/update/password",
    zValidator(
      "json",
      createInsertSchema(usersTable).omit({
        username: true,
        email: true,
        profilePic: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const updateValues = c.req.valid("json");
      const encrypted = await hashPassword(updateValues.password);
      const { error: queryError, result: newUserResult } = await mightFail(
        db
          .update(usersTable)
          .set({ password: encrypted })
          .where(eq(usersTable.userId, updateValues.userId))
          .returning()
      );
      if (queryError) {
        throw new HTTPException(500, {
          message: "Error updating users table",
          cause: queryError,
        });
      }
      return c.json({ newUser: newUserResult[0] }, 200);
    }
  )
  .post(
    "/update/username",
    zValidator(
      "json",
      createInsertSchema(usersTable).omit({
        password: true,
        email: true,
        profilePic: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const updateValues = c.req.valid("json");
      const { error: queryError, result: newUserResult } = await mightFail(
        db
          .update(usersTable)
          .set({ username: updateValues.username })
          .where(eq(usersTable.userId, updateValues.userId))
          .returning()
      );
      if (queryError) {
        throw new HTTPException(500, {
          message: "Error updating users table",
          cause: queryError,
        });
      }
      return c.json({ newUser: newUserResult[0] }, 200);
    }
  )
  .get("/:userId", async (c) => {
    const userId = c.req.param("userId");
    if (!userId) {
      return c.json({ error: "userId parameter is required." }, 400);
    }
    const { result: userQueryResult, error: userQueryError } = await mightFail(
      db
        .select({
          userId: usersTable.userId,
          username: usersTable.username,
          email: usersTable.email,
          password: usersTable.password,
          profilePic: usersTable.profilePic,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(eq(usersTable.userId, userId))
    );
    if (userQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching user chats.",
        cause: userQueryError,
      });
    }
    return c.json({ fetchedUser: userQueryResult });
  })
  .post(
    "/reset/password",
    zValidator(
      "json",
      createInsertSchema(usersTable).omit({
        userId: true,
        username: true,
        password: true,
        profilePic: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const updateValues = c.req.valid("json");
      const newPassword = Math.floor(100000 + Math.random() * 900000);
      const encrypted = await hashPassword(newPassword.toString());
      const { error: queryError, result: newUserResult } = await mightFail(
        db
          .update(usersTable)
          .set({ password: encrypted })
          .where(eq(usersTable.email, updateValues.email))
          .returning()
      );
      if (queryError) {
        throw new HTTPException(500, {
          message: "Error updating users table",
          cause: queryError,
        });
      }
      sendResetPasswordEmail(
        updateValues.email,
        newUserResult[0].username,
        newPassword.toString()
      );
      return c.json({ newUser: newUserResult[0] }, 200);
    }
  );

function sendResetPasswordEmail(
  email: string,
  username: string,
  newPassword: string
) {
  return new Promise((resolve, reject) => {
    var transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "capychat1@gmail.com",
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    const mail_configs = {
      from: "CapyApp <capychat1@gmail.com>",
      to: email,
      subject: "CapyApp Password Recovery",
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <title>CapyApp - Password Recovery</title>
          <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
          <!-- partial:index.partial.html -->
          <div
              style="font-family: Helvetica,Arial,sans-serif;display:flex;flex-direction: column; min-height: 100vh; background-color: #040406; color: white;">
              <div style="flex:1; margin:50px auto;width:70%;padding:20px 0">
                  <div style="">
                      <a href="https://capyapp-production.up.railway.app/"
                          style="font-size:1.4em;color: rgb(19, 171, 209);text-decoration:none;font-weight:600">CapyApp</a>
                  </div>
                  <p style="padding-top: 20px;padding-bottom: 20px;">Hi ${username},</p>
                  <p>We received a request to reset your password. Your temporary password is:</p>
                  <h2 style="padding-top: 10px;padding-bottom: 10px;color: rgb(19, 171, 209);">
                      ${newPassword}</h2>
                  <p>Please ensure to change to a new, more secure password after logging in by navigating to your Profile.
                  </p>
                  <p>Please continue to enjoy <a href="https://capyapp-production.up.railway.app/"
                          style="color: rgb(19, 171, 209);text-decoration:none;">CapyApp</a>
                      here :)
                  </p>
                  <p style="padding-top: 20px;padding-bottom: 20px;">Regards,</p>
                  <p style="font-size: large;">CapyApp</p>
                  <img src="https://capyapp-production.up.railway.app/capyness.png" alt=""
                      style="width:35px;height:35px; margin-top: 10px;">
              </div>
          </div>
          <!-- partial -->
      </body>
      </html>`,
    };
    transporter.sendMail(mail_configs, function (error, info) {
      if (error) {
        console.log(error);
        return reject({ message: `An error has occured` });
      }
      return resolve({ message: "Email sent succesfuly" });
    });
  });
}
