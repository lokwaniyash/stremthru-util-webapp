const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper function to interact with Real-Debrid API
async function realDebridRequest(endpoint, options = {}) {
    const baseUrl = 'https://api.real-debrid.com/rest/1.0';
    const isSelectFilesEndpoint = endpoint.includes('/torrents/selectFiles/');
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${process.env.REAL_DEBRID_API_KEY}`
        }
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`Real-Debrid API error (${response.status}):`, error);
        throw new Error(`Real-Debrid API error: ${response.status} ${response.statusText}`);
    }

    // Special handling for selectFiles endpoint which returns 204 No Content
    if (isSelectFilesEndpoint) {
        console.log(`Real-Debrid API success for ${endpoint} (no content)`);
        return { success: true };
    }

    try {
        const data = await response.json();
        console.log(`Real-Debrid API response for ${endpoint}:`, data);
        return data;
    } catch (error) {
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            console.log(`Real-Debrid API success for ${endpoint} (no content)`);
            return { success: true };
        }
        throw error;
    }
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
        
        // Unrestrict each link to get the actual download URL
        const unrestrictedLinks = await Promise.all(info.links.map(async (link) => {
            const unrestrictData = await realDebridRequest('/unrestrict/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `link=${encodeURIComponent(link)}`
            });
            return unrestrictData.download;
        }));

        // Get download URLs from stremthru for each unrestricted link
        const downloadUrls = [];
        for (const link of unrestrictedLinks) {
            const proxyUrl = createProxyUrl(link);
            console.log('Fetching from stremthru:', proxyUrl);
            const response = await fetch(proxyUrl);
            const data = await response.json();
            console.log('Stremthru response:', data);
            if (data.data && data.data.items && data.data.items.length > 0) {
                downloadUrls.push(...data.data.items);
            }
        }

        console.log('Final download URLs:', downloadUrls);
        return res.json({ success: true, links: downloadUrls });
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
        
        console.log('Processing torrent file:', req.file.originalname);

        // Upload torrent file to Real-Debrid
        const uploadResponse = await realDebridRequest('/torrents/addTorrent', {
            method: 'PUT',
            body: req.file.buffer,
            headers: {
                'Content-Type': 'application/x-bittorrent'
            }
        });

        console.log('Upload response:', uploadResponse);

        if (!uploadResponse || !uploadResponse.id) {
            throw new Error('Failed to get torrent ID from upload response');
        }

        // Wait a moment for the torrent to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Wait a moment for the torrent to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get torrent info first to check available files
        const initialInfo = await realDebridRequest(`/torrents/info/${uploadResponse.id}`);
        console.log('Initial torrent info:', initialInfo);

        // Select all files if available
        if (initialInfo.files && initialInfo.files.length > 0) {
            const fileIds = Array.from({ length: initialInfo.files.length }, (_, i) => i + 1).join(',');
            console.log(`Selecting files: ${fileIds}`);
            await realDebridRequest(`/torrents/selectFiles/${uploadResponse.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `files=${fileIds}`
            });
            console.log('Files selected successfully');

            // Poll for torrent status and links
            let maxAttempts = 10;
            let attempts = 0;
            let info;

            while (attempts < maxAttempts) {
                info = await realDebridRequest(`/torrents/info/${uploadResponse.id}`);
                console.log(`Polling attempt ${attempts + 1}, status: ${info.status}`);

                if (info.links && info.links.length > 0) {
                    break;
                }

                if (info.status === 'error') {
                    throw new Error('Torrent processing failed');
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
            }

            if (!info || !info.links || info.links.length === 0) {
                throw new Error('Timed out waiting for download links');
            }

            // Unrestrict each link to get the actual download URL
            const unrestrictedLinks = await Promise.all(info.links.map(async (link) => {
                const unrestrictData = await realDebridRequest('/unrestrict/link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `link=${encodeURIComponent(link)}`
                });
                return unrestrictData.download;
            }));

            // Get download URLs from stremthru for each unrestricted link
            const downloadUrls = [];
            for (const link of unrestrictedLinks) {
                const proxyUrl = createProxyUrl(link);
                console.log('Fetching from stremthru:', proxyUrl);
                const response = await fetch(proxyUrl);
                const data = await response.json();
                console.log('Stremthru response:', data);
                if (data.data && data.data.items && data.data.items.length > 0) {
                    downloadUrls.push(...data.data.items);
                }
            }

            console.log('Final download URLs:', downloadUrls);
            return res.json({ success: true, links: downloadUrls });
        } else {
            console.log('No files available yet, might need to wait for processing');
            return res.status(400).json({ error: 'No files available in the torrent' });
        }
    } catch (error) {
        console.error('Error processing torrent file:', error);
        return res.status(500).json({ error: error.message || 'Failed to process torrent file' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});