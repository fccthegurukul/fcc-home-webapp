require('dotenv').config();
console.log("API Key:", process.env.GEMINI_API_KEY); // API Key की जाँच करें
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 5001; // या वही पोर्ट जो आप उपयोग कर रहे हैं

app.use(cors());
app.use(express.json()); // अनुरोध बॉडी को JSON के रूप में पार्स करने के लिए

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.geminiPro; // या geminiProVision अगर आप छवियों के साथ काम करना चाहते हैं

app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        console.log("User message received:", userMessage); // उपयोगकर्ता संदेश लॉग करें

        const result = await model.generateContent(userMessage);

        console.log("Gemini API Response (raw):", result); // कच्ची Gemini API प्रतिक्रिया लॉग करें

        const responseText = result.response.text();
        res.json({ response: responseText });
    } catch (error) {
        console.error("Gemini API Error occurred!");
        console.error("Error object:", error); // पूरे त्रुटि ऑब्जेक्ट को लॉग करें
        console.error("Error message:", error.message); // केवल त्रुटि संदेश लॉग करें
        if (error.stack) { // स्टैक ट्रेस लॉग करें यदि उपलब्ध है
            console.error("Error stack trace:", error.stack);
        }
        res.status(500).json({ error: "Failed to generate response", details: error.message });
    }
});

app.listen(port, () => {
    console.log("genAI object:", genAI); // genAI ऑब्जेक्ट की जाँच करें
    console.log(`Server listening on port ${port}`);
});