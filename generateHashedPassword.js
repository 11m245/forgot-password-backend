import { addUser, getUserFromDB } from "./services/user.service.js";
import bcrypt from "bcrypt";
import { app } from "./shortURL";

export async function generateHashedPassword(plainPassword) {
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
  const userfromDB = await getUserFromDB(data);
  if (userfromDB) {
    response.status(400).send({ message: "already user exist on this email" });
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
