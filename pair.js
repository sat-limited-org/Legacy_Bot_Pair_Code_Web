import express from 'express';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

import {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} from '@whiskeysockets/baileys';

import pn from 'awesome-phonenumber';

const router = express.Router();

const sessionsDir = path.join(process.cwd(), 'sessions');

// Make sure the sessions directory exists
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, {
        recursive: true
    });
}

// Remove a directory safely
function removeFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.rmSync(filePath, {
                recursive: true,
                force: true
            });

            console.log(`🧹 Removed session: ${filePath}`);
        }
    } catch (error) {
        console.error('❌ Error removing session:', error);
    }
}

// Track active pairing sessions
const activeSessions = new Map();

/*
|--------------------------------------------------------------------------
| PAIRING CODE ROUTE
|--------------------------------------------------------------------------
*/

router.get('/', async (req, res) => {
    let num = req.query.number;

    // Check if number was provided
    if (!num) {
        return res.status(400).json({
            error: 'Phone number is required'
        });
    }

    // Remove all non-numeric characters
    num = String(num).replace(/\D/g, '');

    // Validate phone number
    const phone = pn('+' + num);

    if (!phone.isValid()) {
        return res.status(400).json({
            error: 'Invalid phone number. Use your full international number without + or spaces.'
        });
    }

    // Convert to proper international format
    num = phone
        .getNumber('e164')
        .replace('+', '');

    console.log(`📱 Pairing request received for: ${num}`);

    // Prevent duplicate pairing sessions
    if (activeSessions.has(num)) {
        return res.status(429).json({
            error: 'A pairing session is already active for this number. Please wait or try again later.'
        });
    }

    const sessionDir = path.join(
        sessionsDir,
        num
    );

    // Remove any old session
    removeFile(sessionDir);

    activeSessions.set(num, true);

    let Legacy;

    try {
        /*
        |--------------------------------------------------------------------------
        | AUTH STATE
        |--------------------------------------------------------------------------
        */

        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(sessionDir);

        /*
        |--------------------------------------------------------------------------
        | CREATE WHATSAPP SOCKET
        |--------------------------------------------------------------------------
        */

        Legacy = makeWASocket({
            auth: {
                creds: state.creds,

                keys: makeCacheableSignalKeyStore(
                    state.keys,

                    pino({
                        level: 'info'
                    })
                )
            },

            logger: pino({
                level: 'info'
            }),

            printQRInTerminal: false,

            browser: Browsers.ubuntu('Chrome'),

            markOnlineOnConnect: false,

            generateHighQualityLinkPreview: false,

            connectTimeoutMs: 60000,

            keepAliveIntervalMs: 30000,

            defaultQueryTimeoutMs: 60000
        });

        /*
        |--------------------------------------------------------------------------
        | SAVE CREDENTIALS
        |--------------------------------------------------------------------------
        */

        Legacy.ev.on(
            'creds.update',
            saveCreds
        );

        /*
        |--------------------------------------------------------------------------
        | CONNECTION UPDATE
        |--------------------------------------------------------------------------
        */

        Legacy.ev.on(
            'connection.update',

            async (update) => {
                const {
                    connection,
                    lastDisconnect,
                    isNewLogin
                } = update;

                if (isNewLogin) {
                    console.log(
                        `🔐 New WhatsApp login detected for ${num}`
                    );
                }

                if (connection === 'connecting') {
                    console.log(
                        `🔄 Connecting WhatsApp for ${num}...`
                    );
                }

                if (connection === 'open') {
                    console.log(
                        `✅ WhatsApp connected successfully for ${num}`
                    );

                    /*
                    |--------------------------------------------------------------------------
                    | IMPORTANT
                    |--------------------------------------------------------------------------
                    | Do not delete the session here while testing.
                    |
                    | The credentials must remain available.
                    |--------------------------------------------------------------------------
                    */

                    activeSessions.delete(num);
                }

                if (connection === 'close') {
                    const statusCode =
                        lastDisconnect
                            ?.error
                            ?.output
                            ?.statusCode;

                    console.log(
                        `❌ WhatsApp connection closed for ${num}`
                    );

                    console.log(
                        '📊 Disconnect status:',
                        statusCode
                    );

                    console.log(
                        '🔍 Full disconnect error:',
                        lastDisconnect?.error
                    );

                    activeSessions.delete(num);

                    /*
                    |--------------------------------------------------------------------------
                    | IMPORTANT
                    |--------------------------------------------------------------------------
                    | Do NOT automatically call initiateSession()
                    | here during pairing.
                    |--------------------------------------------------------------------------
                    */
                }
            }
        );

        /*
        |--------------------------------------------------------------------------
        | GENERATE PAIRING CODE
        |--------------------------------------------------------------------------
        */

        if (!state.creds.registered) {
            console.log(
                `⏳ Waiting before requesting pairing code for ${num}...`
            );

            await delay(3000);

            let code =
                await Legacy.requestPairingCode(num);

            // Format:
            // M1NMQ2Z3
            //
            // Into:
            // M1NM-Q2Z3

            code =
                code
                    ?.match(/.{1,4}/g)
                    ?.join('-') || code;

            console.log(
                `🔑 Pairing code generated for ${num}: ${code}`
            );

            activeSessions.delete(num);

            return res.json({
                success: true,
                code
            });
        }

        activeSessions.delete(num);

        return res.status(400).json({
            error: 'This session is already registered.'
        });

    } catch (error) {
        console.error(
            '❌ Pairing error:',
            error
        );

        activeSessions.delete(num);

        // Clean up failed session
        removeFile(sessionDir);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate pairing code.',
                details: error.message
            });
        }
    }
});

export default router;