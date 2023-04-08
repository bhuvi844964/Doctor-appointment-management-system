const express = require('express');
const fileUpload = require("express-fileupload")
const cors = require("cors");
require("./db/confige")
require('dotenv').config()
const route = require("./routes/route")
const app = express()
const session = require('express-session');


app.use(session({
  secret: process.env.SESSION_SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
  // cookie: { secure: false  , maxAge:60000}
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(fileUpload({
    useTempFiles : true, 
}));
 

app.use('/', route);  


app.listen( process.env.PORT || 4000, function () {
  console.log(`Express app running on port ${process.env.PORT || 4000} `  ) 
});


