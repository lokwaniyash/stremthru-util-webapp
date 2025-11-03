const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper function to interact with Real-Debrid API
async function realDebridRequest(endpoint, options = {}) {
    const baseUrl = 'https://api.real-debrid.com/rest/1.0';
    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${process.env.REAL_DEBRID_API_KEY}`
        }
    });
    return response.json();
}

// Helper function to create stremthru proxy URL
function createProxyUrl(downloadUrl) {
    const encodedUrl = encodeURIComponent(downloadUrl);
    return `${process.env.STREMTHRU_BASE_URL}/v0/proxy?url=${encodedUrl}&token=${process.env.STREMTHRU_TOKEN}`;
}

// Handle magnet link uploads
app.post('/api/magnet', async (req, res) => {
    try {
        const { magnetLink } = req.body;
        
        // Add magnet to Real-Debrid
        const addResponse = await realDebridRequest('/torrents/addMagnet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `magnet=${encodeURIComponent(magnetLink)}`
        });

        // Select all files (you can modify this to be selective)
        await realDebridRequest(`/torrents/selectFiles/${addResponse.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'files=all'
        });

        // Get torrent info and links
        const info = await realDebridRequest(`/torrents/info/${addResponse.id}`);
        
        // Create proxy URLs for each link
        const proxyLinks = info.links.map(link => ({
            original: link,
            proxy: createProxyUrl(link)
        }));

        res.json({ success: true, links: proxyLinks });
    } catch (error) {
        console.error('Error processing magnet link:', error);
        res.status(500).json({ error: 'Failed to process magnet link' });
    }
});

// Handle torrent file uploads
app.post('/api/torrent', upload.single('torrent'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No torrent file provided' });
        }

        // Upload torrent file to Real-Debrid
        const formData = new FormData();
        formData.append('files', req.file.buffer, {
            filename: req.file.originalname,
            contentType: 'application/x-bittorrent'
        });

        const uploadResponse = await realDebridRequest('/torrents/addTorrent', {
            method: 'PUT',
            body: formData
        });

        // Select all files (you can modify this to be selective)
        await realDebridRequest(`/torrents/selectFiles/${uploadResponse.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'files=all'
        });

        // Get torrent info and links
        const info = await realDebridRequest(`/torrents/info/${uploadResponse.id}`);
        
        // Create proxy URLs for each link
        const proxyLinks = info.links.map(link => ({
            original: link,
            proxy: createProxyUrl(link)
        }));

        res.json({ success: true, links: proxyLinks });
    } catch (error) {
        console.error('Error processing torrent file:', error);
        res.status(500).json({ error: 'Failed to process torrent file' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});