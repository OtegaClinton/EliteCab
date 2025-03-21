require("dotenv").config();
const mongoose = require("mongoose");
const uri = process.env.DATABASE_URI;

mongoose.connect(uri)
.then(()=>{
    console.log(`✅ Database connected successfully.`)
})
.catch((error)=>{
    console.log(`Error connecting to Database.`,error.message)
});


module.exports =  mongoose.connect;
