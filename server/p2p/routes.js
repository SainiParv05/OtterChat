const express = require('express');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

const router = express.Router();

const sessions = {};
const messagePool = [];

// SOCKS5 Agent pointing to local Tor proxy for outbound requests
const torProxy = process.env.TOR_PROXY || 'socks5h://127.0.0.1:9050';
const agent = new SocksProxyAgent(torProxy);

const sendToPeer = async (onionUrl, endpoint, data) => {
    return axios.post(`http://${onionUrl}/p2p/${endpoint}`, data, {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 30000
    });
};

/* --- ENDPOINTS FOR PEERS TO HIT OVER TOR --- */

router.post('/request', (req, res) => {
    const { fromUserId, fromOnion, fromPublicKey } = req.body;
    sessions[fromOnion] = {
        userId: fromUserId,
        onionUrl: fromOnion,
        publicKey: fromPublicKey,
        state: 'pending_incoming'
    };
    console.log(`[P2P] Received incoming request from ${fromUserId}`);
    res.json({ success: true });
});

router.post('/accept', (req, res) => {
    const { fromOnion, fromPublicKey } = req.body;
    if (sessions[fromOnion] && sessions[fromOnion].state === 'pending_outgoing') {
        sessions[fromOnion].state = 'connected';
        sessions[fromOnion].publicKey = fromPublicKey;
        console.log(`[P2P] Peer ${fromOnion} accepted request`);
        return res.json({ success: true });
    }
    res.status(400).json({ error: 'No such pending request' });
});

router.post('/message', (req, res) => {
    const { fromOnion, encryptedPayload } = req.body;
    messagePool.push({ fromOnion, encryptedPayload, timestamp: Date.now() });
    console.log(`[P2P] Received message from ${fromOnion}`);
    res.json({ success: true });
});

router.post('/disconnect', (req, res) => {
    const { fromOnion } = req.body;
    delete sessions[fromOnion];
    for (let i = messagePool.length - 1; i >= 0; i--) {
        if (messagePool[i].fromOnion === fromOnion) messagePool.splice(i, 1);
    }
    console.log(`[P2P] Peer ${fromOnion} disconnected`);
    res.json({ success: true });
});

/* --- ENDPOINTS FOR LOCAL REACT FRONTEND --- */

router.post('/outbound-request', async (req, res) => {
    const { targetOnion, myUserId, myOnion, myPublicKey } = req.body;
    sessions[targetOnion] = { onionUrl: targetOnion, state: 'pending_outgoing' };
    try {
        await sendToPeer(targetOnion, 'request', {
            fromUserId: myUserId,
            fromOnion: myOnion,
            fromPublicKey: myPublicKey
        });
        res.json({ success: true });
    } catch (e) {
        delete sessions[targetOnion];
        console.error('[P2P] Error sending request', e.message);
        res.status(500).json({ error: 'Failed to reach peer' });
    }
});

router.post('/outbound-accept', async (req, res) => {
    const { targetOnion, myOnion, myPublicKey } = req.body;
    if (sessions[targetOnion]) {
        sessions[targetOnion].state = 'connected';
        try {
            await sendToPeer(targetOnion, 'accept', { fromOnion: myOnion, fromPublicKey: myPublicKey });
            res.json({ success: true });
        } catch (e) {
            console.error('[P2P] Error sending accept', e.message);
            res.status(500).json({ error: 'Failed to reach peer' });
        }
    } else {
        res.status(400).json({ error: 'No pending request' });
    }
});

router.post('/outbound-message', async (req, res) => {
    const { targetOnion, myOnion, encryptedPayload } = req.body;
    try {
        await sendToPeer(targetOnion, 'message', { fromOnion: myOnion, encryptedPayload });
        res.json({ success: true });
    } catch (e) {
        console.error('[P2P] Error sending message', e.message);
        res.status(500).json({ error: 'Failed to deliver message' });
    }
});

router.post('/outbound-disconnect', async (req, res) => {
    const { targetOnion, myOnion } = req.body;
    try {
        await sendToPeer(targetOnion, 'disconnect', { fromOnion: myOnion });
    } catch (e) {
        // Ignore error if peer is already gone
    }
    delete sessions[targetOnion];
    for (let i = messagePool.length - 1; i >= 0; i--) {
        if (messagePool[i].fromOnion === targetOnion) messagePool.splice(i, 1);
    }
    res.json({ success: true });
});

router.get('/state', (req, res) => {
    const states = { sessions, messages: [...messagePool] };
    messagePool.length = 0; // ensure purely ephemeral
    res.json(states);
});

// A helper for the frontend to register onto the central Directory Server!
let DS_URL = process.env.DIRECTORY_SERVER_URL || 'http://127.0.0.1:4000'; // Usually an .onion url

const getDsConfig = () => DS_URL.includes('.onion') ? { httpAgent: agent, httpsAgent: agent } : {};

router.post('/set-directory-server', async (req, res) => {
    const { url } = req.body;
    DS_URL = url || DS_URL;
    try {
        await axios.get(`${DS_URL}/search`, getDsConfig());
        res.json({ success: true, url: DS_URL });
    } catch (e) {
        res.status(400).json({ error: 'Could not connect to Directory Server at ' + DS_URL });
    }
});
router.post('/directory-register', async (req, res) => {
    const { userId, publicKey, onionAddress } = req.body;
    try {
        const { data } = await axios.post(`${DS_URL}/register`, { userId, publicKey, onionAddress }, getDsConfig());
        res.json(data);
    } catch (e) {
        console.error('[P2P] Error registering with DS', e.message);
        res.status(500).json({ error: 'Failed to register directory' });
    }
});

router.get('/directory-search', async (req, res) => {
    try {
        const { data } = await axios.get(`${DS_URL}/search?q=${req.query.q || ''}`, getDsConfig());
        res.json(data);
    } catch (e) {
        console.error('[P2P] Error searching DS', e.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
