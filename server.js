require("dotenv").config();
const express = require("express");
require("./config/db"); 

const PORT = process.env.PORT || 2025;
const app = express();

app.use(express.json());

app.listen(PORT, () => {
    console.log(`🚀 Server is listening on PORT: ${PORT}`);
});
