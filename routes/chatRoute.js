const express = require("express");
const router = express.Router();
const { authenticator } = require("../middlewares/authentication");
const { sendMessage, getChatHistory } = require("../controllers/chatController");

router.post("/chat", authenticator, sendMessage);
router.get("/chat/:userId", authenticator, getChatHistory);

module.exports = router;