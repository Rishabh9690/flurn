const express= require('express');
const app= express();
const route= require("./routes/Routes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", route);

require("./database/connection");

const startServer = () => {
    app.listen(4444, () => {
      console.log("server is up and running..!!");
    });
  };
  
  startServer();