const mongoose = require('mongoose');
require('dotenv').config();
mongoose.set('strictQuery', false);

mongoose.connect(process.env.URL,  { useNewUrlParser: true })

.then( () => console.log("MongoDb is connected"))
.catch ( err => console.log(err) )   
