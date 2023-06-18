const mysql = require("mysql2");

const connection = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Rishabh@Mysql01",
    database: "flurn",
    debug: false,
    multipleStatements: true,
  });

  connection.getConnection(function (err, connection) {
    // Use the connection
    if (err) {
      console.log("DB Error" + err);
    } else {
      console.log("Database is Connected..!!");
    }
  });

  
module.exports = { connection };