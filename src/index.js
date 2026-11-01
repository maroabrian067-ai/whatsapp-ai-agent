import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config, validateConfig } from './config.js';
import { generateSmartResponse } from './ai.js';

validateConfig();

const AUTH_FOLDER = 'auth_info_baileys';
const logger = pino({ level: 'silent' });

// Cache recently sent message IDs to prevent self-reply loops
const sentMessageIds = new Set();

async function startWhatsAppBot() {
  console.log('\n=============================================');
  console.log('🤖 WhatsApp AI Agent Starting...');
  console.log(`🧠 AI Provider: ${config.aiProvider.toUpperCase()}`);
  console.log(`⚙️  Model: ${config.aiProvider === 'gemini' ? config.gemini.model : config.openai.model}`);
  console.log(`👤 Ignore Self: ${config.ignoreSelf}`);
  console.log('=============================================\n');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
    version: [2, 3000, 1015901307],
    isLatest: false,
  }));

  console.log(`Using WhatsApp Web v${version.join('.')}`);

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: false,
    defaultQueryTimeoutMs: undefined, // disables 60s timeout aborts
    connectTimeoutMs: 60000,
    retryRequestDelayMs: 500,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Scan this QR code using WhatsApp on your phone:');
      console.log('👉 WhatsApp -> Settings -> Linked Devices -> Link a Device\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`🔌 Connection closed (code: ${statusCode}). Reconnecting in 3s...`);

      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      } else {
        console.log('❌ Logged out. Delete "auth_info_baileys" and run "npm start" to re-scan.');
      }
    } else if (connection === 'open') {
      console.log('\n✅ WhatsApp connection established successfully!');
      console.log('🚀 AI Agent is live and listening for messages...\n');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Only process real-time incoming messages
    for (const msg of messages) {
      try {
        if (!msg.message) continue;

        // Ignore messages sent by the bot itself to prevent infinite loop
        if (msg.key.id && sentMessageIds.has(msg.key.id)) {
          sentMessageIds.delete(msg.key.id);
          continue;
        }

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid?.endsWith('@g.us');
        const isFromMe = msg.key.fromMe;

        if (!remoteJid || remoteJid === 'status@broadcast') continue;
        if (isGroup && !config.respondToGroups) continue;
        if (isFromMe && config.ignoreSelf) continue;

        // Unwrap modern ephemeral or wrapped messages
        let messageContent = msg.message;
        if (messageContent.ephemeralMessage?.message) {
          messageContent = messageContent.ephemeralMessage.message;
        }
        if (messageContent.viewOnceMessage?.message) {
          messageContent = messageContent.viewOnceMessage.message;
        }
        if (messageContent.viewOnceMessageV2?.message) {
          messageContent = messageContent.viewOnceMessageV2.message;
        }

        const messageText =
          messageContent.conversation ||
          messageContent.extendedTextMessage?.text ||
          messageContent.imageMessage?.caption ||
          messageContent.videoMessage?.caption ||
          '';

        if (!messageText || messageText.trim() === '') continue;

        const senderDisplay = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', ' (LID)');
        const pushName = msg.pushName || 'User';

        console.log(`\n📩 Incoming from ${pushName} [${senderDisplay}]: "${messageText}"`);

        // Mark as read in background without blocking
        if (config.autoRead) {
          sock.readMessages([msg.key]).catch(() => {});
        }

        // Show typing indicator in background without blocking
        sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});

        console.log(`⏳ Generating AI response with ${config.aiProvider}...`);
        const replyText = await generateSmartResponse(remoteJid, messageText);
        console.log(`🤖 AI finished response (${replyText.length} characters)`);

        sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});

        console.log(`📤 Sending reply to ${remoteJid}...`);

        // Send directly without quoted message to prevent LID resolution timeouts
        let sent;
        try {
          sent = await sock.sendMessage(remoteJid, { text: replyText });
        } catch (sendErr) {
          console.warn(`Direct send failed (${sendErr.message}), retrying...`);
          sent = await sock.sendMessage(remoteJid, { text: replyText });
        }

        if (sent?.key?.id) {
          sentMessageIds.add(sent.key.id);
        }

        console.log(`✅ Reply successfully delivered to ${pushName}!`);
      } catch (err) {
        console.error('❌ Error handling message:', err.message);
      }
    }
  });
}

startWhatsAppBot().catch((err) => {
  console.error('Fatal initialization error:', err);
});
