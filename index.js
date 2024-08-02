const express = require("express");

const path = require("path");

const app=express();
app.use(express.json());

const {open} = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath=path.join(__dirname, "logData.db");

const cors=require("cors");
app.use(cors());

const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");

let db;

let intializeDataBaseAndServer=async()=>{
    try{
        db=await open({
            filename:dbPath,
            driver:sqlite3.Database
        });

     
            app.listen(3000,()=>{
                console.log("server is running at http://localhost:3000");
            })
        
        // table for login and register user
        await db.run(`CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            password TEXT

        );`);

        // table for todos
        await db.run(`CREATE TABLE IF NOT EXISTS todos(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            description TEXT,
            user_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );`);

        //table for session each user login and logouttime
        await db.run(`CREATE TABLE IF NOT EXISTS sessions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            login_time TEXT,
            logout_time TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );`);


    }
 
    catch(err){
        console.log(err.message);
        process.exit(1);
    }



}

intializeDataBaseAndServer();

// user register
app.post("/register", async (request, response) => {
    const { username, password } = request.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const selectUserQuery = `SELECT * FROM users WHERE username = ?`;

    try {
        //await db.run("BEGIN TRANSACTION"); // Start transaction

        const dbUser = await db.get(selectUserQuery, [username]);
        if (dbUser === undefined) {
            const createUserQuery = `INSERT INTO users (username, password) VALUES (?, ?)`;
            await db.run(createUserQuery, [username, hashedPassword]);
            //await db.run("COMMIT"); // Commit transaction
            response.status(200);
            response.send("user created successfully");
        } else {
            //await db.run("ROLLBACK"); // Rollback transaction
            response.status(400);
            response.send("user already exists");
        }
    } catch (err) {
        //await db.run("ROLLBACK"); // Rollback transaction
        //console.log(err.message);
        response.status(500);
        response.send("Internal Server Error");
    }
});

// user login

app.post("/login", async (request, response) => {
    const { username, password } = request.body;
  
    const selectUserQuery = `SELECT * FROM users WHERE username = ?`;
    const dbUser = await db.get(selectUserQuery, [username]);
  
    if (!dbUser) {
      response.status(400).send({ error: "Invalid user" });
      return;
    }
  
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (!isPasswordMatched) {
      response.status(400).send({ error: "Invalid password" });
      return;
    }
  
    const payload = { username: username };
    const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
    response.send({ jwtToken: jwtToken, username: username, id: dbUser.id });
  });

//get all user details

app.get("/allUsers/", async (request, response) => {
    const selectQuery = `SELECT * FROM users;`;
        const dbResponse = await db.all(selectQuery);
            response.status(200);
            response.send(dbResponse);

}
);

app.post("/todos", async (request, response) => {
    const { title, description, user_id } = request.body;
    try {
      await db.beginTransaction();
      const createTodoQuery = `
        INSERT INTO todos (title, description, user_id)
        VALUES (?, ?, ?);
      `;
      await db.run(createTodoQuery, [title, description, user_id]);
      await db.commit();
      response.status(200);
      response.send("todo created successfully");
    } catch (error) {
      console.error(error);
      await db.rollback();
      response.status(500);
      response.send("Failed to create todo");
    }
  });


//get todo/id

app.get("/todos/:id",async(request,response)=>{
    const {id}=request.params;
    const selectTodoQuery=`SELECT * FROM todos WHERE user_id='${id}';`;
    const dbTodo=await db.all(selectTodoQuery);
    response.status(200);
    
    response.send(dbTodo);
});

app.get("/getAllTodos",async(request,response)=>{
    const selectAllTodoQuery=`SELECT * FROM todos;`;
    const dbTodo=await db.all(selectAllTodoQuery);
    response.status(200);

    response.send(dbTodo);
});


app.put("/todos/:id",async(request,response)=>{
    const {id}=request.params;
    const {title,description}=request.body;
    const updateTodoQuery=`UPDATE todos SET title='${title}',description='${description}' WHERE id='${id}';`;
    await db.run(updateTodoQuery);
    response.status(200);
   
    response.send("todo updated successfully");
});

app.delete("/todos/:id",async(request,response)=>{
    const {id}=request.params;
    const deleteTodoQuery=`DELETE FROM todos WHERE id='${id}';`;
    await db.run(deleteTodoQuery);
    response.status(200);
    
    response.send("todo deleted successfully");
});


app.get("/sessions",async(request,response)=>{
    const alluserSessionsQuery=`SELECT * FROM sessions;`;
    const dbSessions=await db.all(alluserSessionsQuery);
    response.status(200);
    response.send(dbSessions);
    });


// login session timing 
app.post("/loginSession",async(request,response)=>{
    const {user_id,login_time,logout_time}=request.body;
    const createSessionQuery=`INSERT INTO sessions(user_id,login_time,logout_time)
    VALUES('${user_id}','${login_time}','${logout_time}');`;
    await db.run(createSessionQuery);
    response.status(200);

    response.send("session created successfully");
});