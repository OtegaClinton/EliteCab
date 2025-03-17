require("dotenv").config();
const express = require("express");
require("./config/db"); 
const userRoutes = require("./routes/userRoute"); 

const PORT = process.env.PORT || 2025;
const app = express();

app.use(express.json());

app.use("/api/v1", userRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server is listening on PORT: ${PORT}`);
});
