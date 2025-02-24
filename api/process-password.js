const express = require('express');
const mongoose = require('mongoose');
const serverless = require('serverless-http');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB bağlantısı
mongoose.connect('mongodb+srv://elmastekyazilim:8Rug3mWAC6Exkgh@cluster0.oswmayz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB bağlantı hatası:'));
db.once('open', () => console.log('MongoDB bağlandı'));

// Şifre şeması
const PasswordSchema = new mongoose.Schema({
    deviceInfo1: { type: String, unique: true, required: true },
    deviceInfo2: { type: String, unique: true, required: true },
    passwordOption: { type: String },
    passwordOption2: { type: String },
    finalPsw: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const PasswordModel = mongoose.model('Password', PasswordSchema);

// Şifre işlem API'si
app.post('/', async (req, res) => {
    try {
        const { userPassword, deviceInfo1, deviceInfo2, passwordOption, passwordOption2 } = req.body;

        // Kullanıcı doğrulama
        const collection = db.collection("userPasswords");
        const user = await collection.findOne({ userName: "Nachi" });

        const collection2 = db.collection("masterPasswords");
        const user2 = await collection2.findOne({ masterUser: "master" });

        if (!user || !user2) return res.status(400).json({ error: 'Kullanıcı bulunamadı' });

        if (userPassword !== user.passwordUser && userPassword !== user2.masterPassword) {
            return res.status(400).json({ error: 'Hatalı Kullanıcı Şifresi' });
        }

        // Daha önce kullanılmış mı kontrolü
        if (userPassword !== user2.masterPassword) {
            const existing = await PasswordModel.findOne({ deviceInfo1, deviceInfo2 });
            if (existing) return res.status(400).json({ error: 'Bu şifre daha önce kullanılmış' });
        }

        // Şifre işlemleri
        const result = `hashed_${deviceInfo1}_${deviceInfo2}_${passwordOption}_${passwordOption2}`;

        // Şifre kaydı
        if (userPassword === user.passwordUser) {
            const newEntry = new PasswordModel({ deviceInfo1, deviceInfo2, passwordOption, passwordOption2, finalPsw: result });
            await newEntry.save();
        }

        res.json({ message: 'Şifre işlendi', result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = serverless(app);
