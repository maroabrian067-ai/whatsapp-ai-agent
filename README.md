# 🤖 WhatsApp AI Agent (Gemini & ChatGPT)

An intelligent, multi-turn WhatsApp AI Agent that connects your WhatsApp to **Google Gemini** or **OpenAI ChatGPT**. When someone sends a WhatsApp message to your number, the bot reads it, remembers the conversation context, shows a live typing indicator, and generates a smart response.

---

## 🚀 Quick Start in VS Code

### 1. Open VS Code Terminal
Press <kbd>Ctrl</kbd> + <kbd>`</kbd>

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Your API Key
Open `.env` and paste your Gemini API key from https://aistudio.google.com/app/apikey:
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 4. Start the Agent
```powershell
npm start
```

### 5. Scan QR Code
Scan the terminal QR code with your phone (WhatsApp -> Linked Devices -> Link a Device).
