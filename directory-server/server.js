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
let directory = {};

if (fs.existsSync(DB_PATH)) {
    try {
        directory = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
        console.error('Failed to parse database', e);
    }
}

const saveDB = () => fs.writeFileSync(DB_PATH, JSON.stringify(directory, null, 2));

// Register a user's ONION address and public key
app.post('/register', (req, res) => {
    const { userId, publicKey, onionAddress } = req.body;
    if (!userId || !onionAddress) {
        return res.status(400).json({ error: 'Missing userId or onionAddress' });
    }
    directory[userId] = {
        publicKey: publicKey || (directory[userId] && directory[userId].publicKey),
        onionAddress,
        lastSeen: Date.now()
    };
    saveDB();
    res.json({ success: true, message: 'Registered successfully' });
});

// Lookup a user by ID
app.get('/lookup/:userId', (req, res) => {
    const user = directory[req.params.userId];
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
    res.json(results);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Directory Server running on port ${PORT}`);
});
