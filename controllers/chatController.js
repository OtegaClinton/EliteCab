const Chat = require("../models/chatModel");

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { receiver, message } = req.body;
        const sender = req.user.id;

        const newMessage = new Chat({ sender, receiver, message });
        await newMessage.save();

        res.status(201).json({ message: "Message sent successfully", chat: newMessage });
    } catch (error) {
        res.status(500).json({ error: "Error sending message" });
    }
};

// Get chat history between two users
exports.getChatHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = req.user.id;

        const chatHistory = await Chat.find({
            $or: [
                { sender: currentUser, receiver: userId },
                { sender: userId, receiver: currentUser }
            ]
        }).sort({ timestamp: 1 });

        res.status(200).json(chatHistory);
    } catch (error) {
        res.status(500).json({ error: "Error fetching chat history" });
    }
};
