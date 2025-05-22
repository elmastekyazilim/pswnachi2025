const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


mongoose.connect('mongodb+srv://elmastekyazilim:8Rug3mWAC6Exkgh@cluster0.oswmayz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB bağlanti hatasi:'));
db.once('open', () => console.log('MongoDB bağlandi'));


// Şema ve Model
const PasswordSchema = new mongoose.Schema({
    deviceInfo1: { type: String, unique: true, required: true },
    deviceInfo2: { type: String, unique: true, required: true },
    passwordOption: { type: String},
    passwordOption2: { type: String},
    finalPsw:{ type: String},
    timestamp: { type: Date, default: Date.now }
});

const PasswordModel = mongoose.model('Password', PasswordSchema);

// Şifre ve ID listeleri
const psw_arr = [[90, 145, 162, 254],[8, 127, 192, 199],[18, 124, 197, 246],[34, 131, 132, 209],[63, 140, 172, 238],[69, 107, 166, 251],[20, 130, 197, 225],[13, 20, 21, 105],[13, 82, 115, 235],[33, 132, 159, 252],[147, 150, 151, 210],[8, 139, 197, 228],[10, 70, 120, 236],[5, 87, 16, 248],[231, 67, 169, 84]];
const pswNames = ["NACHI-N","NACHI-M","NACHI-D","MIRNADO-N","MIRNADO-M","MIRNADO-D","8G","13G","15G","23G","25G","34G","43G","52G","62G"];

// 4 karakterlik hex string'i 2 byte buffer'a dönüştür
function hexTo2ByteArray(hexString) {
    if (hexString.length !== 4) {
        throw new Error("Hex string must be exactly 4 characters long");
    }
    const value = parseInt(hexString, 16);
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(value, 0); // Big Endian
    return buffer;
}
function crcToHexBigEndian(crcValue) {
    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(crcValue);
    return buf.toString('hex');
}

function crc16(buf) {
    let crc = 0xFFFF;
    for (let b of buf) {
        crc ^= b << 8;
        for (let i = 0; i < 8; i++) {
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : (crc << 1);
        }
    }
    return crc & 0xFFFF;
}

// API route
app.post('/process-password', async (req, res) => {
    const { userPassword, deviceInfo1, deviceInfo2, passwordOption, passwordOption2 } = req.body;

    try {
        const collection = db.collection("userPasswords");
        const user = await collection.findOne({ userName: "Nachi" });

        const collection2 = db.collection("masterPasswords");
        const user2 = await collection2.findOne({ masterUser: "master" });

        const pwdUser = user?.passwordUser;
        const pwdMaster = user2?.masterPassword;

        if (!pwdUser || !pwdMaster) {
            return res.status(500).json({ error: "Şifre kayıtları eksik" });
        }

        if ((userPassword === pwdUser) || (userPassword === pwdMaster)) {
            if (userPassword !== pwdMaster) {
                const existing = await PasswordModel.findOne({ deviceInfo1: deviceInfo1, deviceInfo2: deviceInfo2 });
                if (existing) {
                    return res.status(400).json({ error: 'Bu şifre daha önce kullanılmış' });
                }
            }

            const byteArray = hexTo2ByteArray(deviceInfo1);
            const byteArray2 = hexTo2ByteArray(deviceInfo2);

            const index1 = pswNames.indexOf(passwordOption);
            const index2 = pswNames.indexOf(passwordOption2);

            if (index1 === -1 || index2 === -1) {
                return res.status(400).json({ error: 'Geçersiz şifre seçenekleri' });
            }

            const joinedList1 = Buffer.concat([Buffer.from(psw_arr[index1]), byteArray, byteArray2]);
            const crcValue1 = crc16(Uint8Array.from(joinedList1));
            const signedPackage = ('0000' + crcValue1.toString(16)).slice(-4);
            console.log(crcValue1);
            const joinedList2 = Buffer.concat([Buffer.from(psw_arr[index2]), byteArray, byteArray2]);
            const crcValue2 = crc16(Uint8Array.from(joinedList2));
            const signedPackage2 = ('0000' + crcValue2.toString(16)).slice(-4);
            console.log(crcValue2);
            const result = signedPackage + signedPackage2;
         
          
            
            if (userPassword === pwdUser) {
                const newEntry = new PasswordModel({
                    deviceInfo1: deviceInfo1,
                    deviceInfo2: deviceInfo2,
                    passwordOption: passwordOption,
                    passwordOption2: passwordOption2,
                    finalPsw: result
                });
                await newEntry.save();
            }

            return res.json({ message: 'Şifre işlendi', result });
        } else {
            return res.status(400).json({ error: 'Hatalı Kullanıcı Şifresi' });
        }

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
});


// HTML Sayfası Servis Etme
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ${PORT} port çalışıyor`);
     
});


