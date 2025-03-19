require("dotenv").config();
const express = require("express");
require("./config/db"); 
const userRoutes = require("./routes/userRoute");
const chatRoutes = require("./routes/chatRoute");
const rideRoutes = require("./routes/rideRoute"); 

const PORT = process.env.PORT || 2025;
const app = express();

app.use(express.json());

app.use("/api/v1", userRoutes, chatRoutes, rideRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server is listening on PORT: ${PORT}`);
});
