const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const DB_PATH = path.join(__dirname, 'directory.json');
const LOG_PATH = path.join(__dirname, 'ds-activity.log');
let directory = {};

if (fs.existsSync(DB_PATH)) {
    try {
        directory = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
        console.error('Failed to parse database', e);
    }
}

const saveDB = () => fs.writeFileSync(DB_PATH, JSON.stringify(directory, null, 2));

// --- Logging ---
function log(event, details) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${event} | ${details}\n`;
    console.log(line.trim());
    fs.appendFileSync(LOG_PATH, line);
}

// Register a user's ONION address and public key
app.post('/register', (req, res) => {
    const { userId, publicKey, onionAddress } = req.body;
    if (!userId || !onionAddress) {
        return res.status(400).json({ error: 'Missing userId or onionAddress' });
    }
    const isNew = !directory[userId];
    directory[userId] = {
        publicKey: publicKey || (directory[userId] && directory[userId].publicKey),
        onionAddress,
        lastSeen: Date.now()
    };
    saveDB();
    log(isNew ? 'NEW_REGISTRATION' : 'RE-REGISTRATION', `user="${userId}" onion="${onionAddress}"`);
    res.json({ success: true, message: 'Registered successfully' });
});

// Lookup a user by ID
app.get('/lookup/:userId', (req, res) => {
    const user = directory[req.params.userId];
    log('LOOKUP', `target="${req.params.userId}" found=${!!user}`);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

// Search users by partial ID
app.get('/search', (req, res) => {
    const q = req.query.q || '';
    const results = Object.keys(directory)
        .filter(id => id.includes(q))
        .map(id => ({
            userId: id,
            onionAddress: directory[id].onionAddress
        }));
    if (q) log('SEARCH', `query="${q}" results=${results.length}`);
    res.json(results);
});

// View logs endpoint
app.get('/logs', (req, res) => {
    try {
        const logs = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : 'No logs yet.';
        res.type('text/plain').send(logs);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read logs' });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    log('SERVER_START', `Directory Server running on port ${PORT}`);
    console.log(`Directory Server running on port ${PORT}`);
});
