import express from "express";
import { MongoClient } from "mongodb";
import {
  addUser,
  getUserFromDB,
  getUserFromDBByUserName,
  storeResetTokenInDB,
  getUserFromResetToken,
  getUserFromID,
  updatePasswordInDB,
  getUserFromDBbyUserNameOREmail,
} from "./services/user.service.js";
import bcrypt from "bcrypt";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const app = express();
const PORT = process.env.PORT;
app.use(express.json());
app.use(cors());
//mongo connection

const MONGO_URL = process.env.MONGO_URL;
export const client = new MongoClient(MONGO_URL);
client.connect();
console.log("mongo connected");

app.listen(PORT, () => console.log("app started in PORT", PORT));

app.get("/", function (request, response) {
  response.send("welcome to password reset api");
});

async function generateHashedPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  return hashedPassword;
}

function checkDataValid(data) {
  const { username, password, mobile, email, age, name } = data;
  const valid =
    username.length > 5 &&
    password.length > 7 &&
    mobile.length > 9 &&
    age > 11 &&
    name.length > 2
      ? true
      : false;
  return valid;
}
app.post("/signup", async function (request, response) {
  const data = request.body;
  const userfromDB = await getUserFromDBbyUserNameOREmail(data);
  if (userfromDB) {
    response
      .status(400)
      .send({ message: "already user exist on this email / username" });
  } else {
    const isValidData = checkDataValid(data);
    if (isValidData) {
      const formattedData = {
        ...data,
        password: await generateHashedPassword(data.password),
      };
      const result = await addUser(formattedData);
      response.status(201).send({ message: "Signup Success try Login" });
    } else {
      response
        .status(400)
        .send({ message: "info doesn't pass the input field rules" });
    }
  }
});

app.post("/login", async function (request, response) {
  const data = request.body;
  const userfromDB = await getUserFromDBByUserName(data);
  if (userfromDB) {
    const isPasswordMatch = await bcrypt.compare(
      data.password,
      userfromDB.password
    );
    console.log("is pass match", isPasswordMatch);
    if (isPasswordMatch) {
      response.status(200).send({ message: "User Login Successfull" });
    } else {
      response.status(401).send({ message: "Invalid Credentials" });
    }
  } else {
    response.status(400).send({ message: "Invalid Credentials." });
  }
});

app.post("/forgot-password", async function (request, response) {
  const data = request.body;
  // console.log("rrr", data);
  const userfromDB = await getUserFromDBByUserName(data);
  // console.log("response from db", userfromDB);
  if (userfromDB) {
    response
      .status(200)
      .send({ message: "Click on Reset Password to send an email" });
  } else {
    response
      .status(400)
      .send({ message: "Invalid Credentials. try registration first" });
  }
});

//node mailer

// async..await is not allowed in global scope, must use a wrapper
async function mailer(userResetInfo) {
  // console.log("user reset info", userResetInfo);
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail", //intead port use service gmail
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL, //  gmail user id
      pass: process.env.PASS, // generated gmail app password
    },
  });
  // send mail with defined transporter object
  const url = `${process.env.API_CLIENT}/reset-password/${userResetInfo.resetToken}`;
  let info = await transporter.sendMail({
    from: '"URL Shortener 👻" <sivaraj2siva@gmail.com>', // sender address
    to: `${userResetInfo.email}`, // list of receivers
    subject: "Password Reset for url shortener App", // Subject line
    text: `Hi ${userResetInfo.name}, as you have requested to reset Password, this is the link please click and reset. ${process.env.API_CLIENT}/change-password/${userResetInfo.resetToken}`, // plain text body
    html: `<div > <p>Hi ${userResetInfo.name} as you have requested to reset Password, this is the link please click and reset. ${process.env.API_CLIENT}/change-password/${userResetInfo.resetToken} </p> <b>Hello world?</b> <a href=${url} target="_blank">Reset Password</a></div>`, // html body
  });
  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
}
// mailer().catch(console.error); //function call

async function generateToken(userfromDB) {
  const token = jwt.sign(
    { id: userfromDB._id, time: Date.now() },
    process.env.SECRET_KEY
  );
  return token;
}
app.post("/sendResetLink", async function (request, response) {
  const data = request.body;
  console.log("got ddd", data);
  const userfromDB = await getUserFromDBByUserName(data);
  if (userfromDB) {
    const resetToken = await generateToken(userfromDB);
    // console.log("TOKEN", token);
    await storeResetTokenInDB({
      user_id: userfromDB._id,
      resetToken: resetToken,
    });

    const userResetInfo = { ...userfromDB, resetToken: resetToken };
    await mailer(userResetInfo).catch(console.error);
    response.status(200).send({
      message: "Click on Reset Password link has been sent to your email",
    });
  } else {
    response
      .status(400)
      .send({ message: "Invalid Credentials. try registration first" });
  }
});

app.get("/change-password", async function (request, response) {
  const resetTokenFromFront = request.headers.resettoken;
  // console.log("resetTokenFromFront", resetTokenFromFront);
  const userFromDB = await getUserFromResetToken(resetTokenFromFront);
  // console.log("forgotUserfromDB", userFromDB);
  if (userFromDB) {
    const user = await getUserFromID(userFromDB.user_id);
    // console.log("user", user);
    response.send({
      message: "user Found being redirected to ResetPage",
      username: user.username,
    });
  } else {
    response
      .status(400)
      .send({ message: "Invalid Credentials. try registration first" });
  }
});

app.post("/change-password", async function (request, response) {
  const resetTokenFromFront = request.headers.resettoken;
  const values = request.body;
  // console.log("resetTokenFromFront", resetTokenFromFront);
  // console.log("values from front", values);
  const tokendedUserFromDB = await getUserFromResetToken(resetTokenFromFront);
  // console.log("forgotUserfromDB", tokendedUserFromDB);
  const tokenedUser = await getUserFromID(tokendedUserFromDB.user_id);
  // const isUserAndTokenVerified = verfiyUserAndToken(values,tokenedUser);
  if (tokenedUser.username === values.username) {
    // console.log("request valid");
    if (values.password === values.cpassword) {
      const hashedNewPassword = await generateHashedPassword(values.password);
      await updatePasswordInDB(tokenedUser.username, hashedNewPassword);
      response.send({
        message: "Password Change Success",
      });
    } else {
      response.status(400).send({
        message: "Password and confirm password should be same",
      });
    }
  } else {
    response.status(400).send({ message: "Unauthorised useage" });
  }
});
