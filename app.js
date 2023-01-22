const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server is running at http://localhost:3000")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.get("/user/", async (request, response) => {
  const getUserQuery = `
     SELECT
        *
    FROM 
        user
    ORDER BY 
        username;`;
  const userArray = await database.all(getUserQuery);
  response.send(userArray);
});

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashPassword = await bcrypt.hash(request.body.password, 10);
  const usernameQuery = `
    SELECT
        *
    FROM 
        user
    WHERE
        username = '${username}';`;
  const dbUser = await database.get(usernameQuery);
  if (dbUser === undefined) {
    if (request.body.password.length >= 5) {
      const createUserQuery = `
        INSERT INTO
            user(username,
                name,
                password,
                gender,
                location)
        VALUES
            ('${username}',
            '${name}',
            '${hashPassword}',
            '${gender}',
            '${location}')`;
      const dbResponse = await database.run(createUserQuery);

      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectQuery = `
    SELECT
        *
    FROM 
        user
    WHERE 
        username = '${username}';`;
  const dbUser = await database.get(selectQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.newPassword, 10);
  const selectUserQuery = `
    SELECT
        *
    FROM
        user
    WHERE
        username = '${username}';`;
  const dbUser = await database.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (request.body.newPassword.length <= 4) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const changePassword = `
            UPDATE 
                user
            SET
                password = '${hashedPassword}'
            WHERE 
               username = '${username}' ;`;
        const updatedPassword = await database.run(changePassword);

        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
module.exports = app;
