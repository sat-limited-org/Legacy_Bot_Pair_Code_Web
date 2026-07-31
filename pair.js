import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pn from 'awesome-phonenumber';
import * as mega from 'megajs';
import zlib from "zlib";

const router = express.Router();

// Ensure the session directory exists
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    let dirs = './' + (num || `session`);

    // Remove existing session if present
    await removeFile(dirs);

    // Clean the phone number - remove any non-digit characters
    num = num.replace(/[^0-9]/g, '');

    // Validate the phone number using awesome-phonenumber
    const phone = pn('+' + num);
    if (!phone.isValid()) {
        if (!res.headersSent) {
            return res.status(400).send({ code: 'Invalid phone number. Please enter your full international number (e.g., 15551234567 for US, 447911123456 for UK, 84987654321 for Vietnam, etc.) without + or spaces.' });
        }
        return;
    }
    // Use the international number format (E.164, without '+')
    num = phone.getNumber('e164').replace('+', '');

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version, isLatest } = await fetchLatestBaileysVersion();
            let Legacy = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows('Chrome'),
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                retryRequestDelayMs: 250,
                maxRetries: 5,
            });

            Legacy.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, isNewLogin, isOnline } = update;

                if (connection === 'open') {
                    console.log("✅ Connected successfully!");
                    console.log('✅ Legacy MD Session established successfully!');
                    console.log("📱 Sending session file to user...");
                    
                    try {
                        const sessionLegacy = fs.readFileSync(dirs + '/creds.json');
         
// Generate Legacy Session ID
const sessionID =
    "legacy~" +
    zlib.gzipSync(sessionLegacy).toString("base64");

                         // Send session file to user
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                        await Legacy.sendMessage(userJid, {
                            document: sessionLegacy,
                            mimetype: 'application/json',
                            fileName: 'creds.json'
                        });
                        console.log("📄 Session file sent successfully");

                        // Define your default target links / IDs
        const channelInviteLink = "https://whatsapp.com"; 
        const groupInviteLink = "https://whatsapp.com"; 

        // 1. AUTOMATED CHANNEL FOLLOW
        try {
            if (channelInviteLink.includes("://whatsapp.com")) {
                // Resolve the link to a raw newsletter JID and follow it
                const channelMetadata = await sock.newsletterMetadata("invite", channelInviteLink);
                if (channelMetadata && channelMetadata.id) {
                    await sock.newsletterFollow(channelMetadata.id);
                    console.log(`🚀 Followed Channel: ${channelMetadata.id}`);
                }
            }
        } catch (channelError) {
            console.error(`⚠️ Channel setup failed: ${channelError.message || channelError}`);
        }

        // 2. AUTOMATED GROUP JOIN & SUCCESS MESSAGE
        try {
            if (groupInviteLink.includes("://whatsapp.com")) {
                // Extract code after the slash
                const inviteCode = groupInviteLink.split("://whatsapp.com")[1].trim();
                
                  // Join the group and capture its direct JID (ends in @g.us)
                const groupJid = await sock.groupAcceptInvite(inviteCode);
                console.log(`🚀 Joined Group ID: ${groupJid}`);

                if (groupJid) {
                    // Craft the broadcast alert
                    const successMessage = `⚡ *LEGACY MD BOT CONNECTED!* ⚡\n\n` +
                                           `A new user session has been successfully generated via the pairing interface!\n\n` +
                                           `🟢 *Status:* Active / Connected\n` +
                                           `📅 *Timestamp:* ${new Date().toLocaleString()}\n\n` +
                                           `Thank you for deploying with SAT Limited Framework! 🚀`;

                    // Send the string message straight to the joined group
                    await sock.sendMessage(groupJid, { text: successMessage });
                    console.log(`📝 Dispatched success message to group: ${groupJid}`);
                }
            }
        } catch (groupError) {
            console.error(`⚠️ Group automated flow failed: ${groupError.message || groupError}`);
        }

        // Continue running your existing session-sharing delivery sequence to the user...

                       // Send Session ID
await Legacy.sendMessage(userJid, {
    text: `🔑 *Legacy MD Session ID*

\`\`\`
${sessionID}
\`\`\`

⚠️ Do not share this Session ID with anyone.`
});

                        // Send video thumbnail with caption
                        
await Legacy.sendMessage(userJid, {
                            image: { url: 'https://camo.githubusercontent.com/2b7141e4940627f2733c6f181d2fbd338077b4684394ab6c3cff2f11d4fe7491/68747470733a2f2f66696c65732e636174626f782e6d6f652f33376473376a2e706e67' },
                            caption: `⚡ *Legacy MD V2.0.0 !*\n\n🚀 Bug Fixes + New Commands + Fast AI Chat\n\n🫂 Contact Us On: 260972674277`
                        });
                        console.log("⚡ Bot details sent successfully");

                        // Send warning message
                        await Legacy.sendMessage(userJid, {
                            text: `⚠️Do not share this file with anybody⚠️\n 
┌┤✑  Thanks for using Legacy MD Bot
│└────────────┈ ⳹        
│©2026 SAT Limited 
└─────────────────┈ ⳹\n\n`
                        });
                        console.log("⚠️ Warning message sent successfully");

                        // Clean up session after use
                        console.log("🧹 Cleaning up session...");
                        await delay(1000);
                        removeFile(dirs);
                        console.log("✅ Session cleaned up successfully");
                        console.log("🎉 Process completed successfully!");
                        // Do not exit the process, just finish gracefully
                    } catch (error) {
                        console.error("❌ Error sending messages:", error);
                        // Still clean up session even if sending fails
                        removeFile(dirs);
                        // Do not exit the process, just finish gracefully
                    }
                }

                if (isNewLogin) {
                    console.log("🔐 New login via pair code");
                }

                if (isOnline) {
                    console.log("📶 Client is online");
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;

                    if (statusCode === 401) {
                        console.log("❌ Logged out from WhatsApp. Need to generate new pair code.");
                    } else {
                        console.log("🔁 Connection closed — restarting...");
                        initiateSession();
                    }
                }
            });

            if (!Legacy.authState.creds.registered) {
                await delay(3000); // Wait 3 seconds before requesting pairing code
                num = num.replace(/[^\d+]/g, '');
                if (num.startsWith('+')) num = num.substring(1);

                try {
                    let code = await Legacy.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    if (!res.headersSent) {
                        console.log({ num, code });
                        await res.send({ code });
                    }
                } catch (error) {
                    console.error('Error requesting pairing code:', error);
                    if (!res.headersSent) {
                        res.status(503).send({ code: 'Failed to get pairing code. Please check your phone number and try again.' });
                    }
                }
            }

            Legacy.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
        }
    }

    await initiateSession();
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
    let e = String(err);
    if (e.includes("conflict")) return;
    if (e.includes("not-authorized")) return;
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    if (e.includes("Stream Errored")) return;
    if (e.includes("Stream Errored (restart required)")) return;
    if (e.includes("statusCode: 515")) return;
    if (e.includes("statusCode: 503")) return;
    console.log('Caught exception: ', err);
});

export default router;