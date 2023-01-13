import { client } from "../index.js";

export async function addUser(data) {
  return await client
    .db("passwordFlowTask")
    .collection("users")
    .insertOne(data);
}

export async function getUserFromDB(data) {
  const { email } = data;
  return await client
    .db("passwordFlowTask")
    .collection("users")
    .findOne({ email });
}

export async function getUserFromDBbyUserNameOREmail(data) {
  const { email, username } = data;
  return await client
    .db("passwordFlowTask")
    .collection("users")
    .findOne({ $or: [{ email: email }, { username: username }] });
}

export async function getUserFromDBByUserName(data) {
  const { username } = data;
  return await client
    .db("passwordFlowTask")
    .collection("users")
    .findOne({ username });
}

export async function storeResetTokenInDB(data) {
  return await client
    .db("passwordFlowTask")
    .collection("usersResetTokens")
    .insertOne({ ...data, createdAt: Date.now() });
}

export async function getUserFromResetToken(urlData) {
  return await client
    .db("passwordFlowTask")
    .collection("usersResetTokens")
    .findOne({ resetToken: urlData });
}

export async function getUserFromID(id) {
  // console.log("got _id in", id);
  return await client
    .db("passwordFlowTask")
    .collection("users")
    .findOne({ _id: id });
}

export async function updatePasswordInDB(username, newpassword) {
  return await client
    .db("passwordFlowTask")
    .collection("users")
    .updateOne({ username }, { $set: { password: newpassword } });
}
