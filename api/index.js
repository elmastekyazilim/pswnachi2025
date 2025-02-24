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
const pswNames = ["NACHI-N","NACHI-M","NACHI-D","MIRNADO-N","MIRNADO-M","MIRNADO-D","8G","13G","15G","20G","25G","34G","43G","52G","62G"];

/**
 * Calculates the buffers CRC16.
 *
 * @param {Buffer} buffer the data buffer.
 * @return {number} the calculated CRC16.
 * 
 * Source: github.com/yaacov/node-modbus-serial
 */
function crc16(buffer) {
    var crc = 0xFFFF;
    var odd;

    for (var i = 0; i < buffer.length; i++) {
        crc = crc ^ buffer[i];

        for (var j = 0; j < 8; j++) {
            odd = crc & 0x0001;
            crc = crc >> 1;
            if (odd) {
                crc = crc ^ 0xA001;
            }
        }
    }

    return crc;
};



function hexTo2ByteArray(hexString) {
    if (hexString.length !== 4) {
        throw new Error("Hex string must be exactly 4 characters long");
    }
    const value = parseInt(hexString, 16);
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(value, 0);
    return buffer;
}

// API - Şifre işleme
app.post('/process-password', async (req, res) => {
  
    const {userPassword,deviceInfo1,deviceInfo2,passwordOption,passwordOption2} = req.body;

    const collection = db.collection("userPasswords");
    const user = await collection.findOne({ userName: "Nachi" });

    const collection2 = db.collection("masterPasswords");
    const user2 = await collection2.findOne({ masterUser: "master" });


    const pwdUser=user.passwordUser;
    const pwdMaster=user2.masterPassword;

    if((userPassword==pwdUser)||(userPassword==pwdMaster))
    {
        

    try 
    {

        if(userPassword!=pwdMaster)
        {
            const existing = await PasswordModel.findOne({ deviceInfo1: deviceInfo1 },{deviceInfo2: deviceInfo2});
            if (existing) {
                return res.status(400).json({ error: 'Bu şifre daha önce kullanılmış' });
            }
        }


        const hexString = deviceInfo1;
        const byteArray = hexTo2ByteArray(hexString);
        const hexString2 = deviceInfo2;
        const byteArray2 = hexTo2ByteArray(hexString2);

        const index = pswNames.indexOf(passwordOption);
        const joinedList = Buffer.concat([Buffer.from(psw_arr[index]), byteArray,byteArray2]);
        const signedPackage = (crc16(Uint8Array.from(joinedList))>>8).toString(16);

        const index2 = pswNames.indexOf(passwordOption2);
        const joinedList2 = Buffer.concat([Buffer.from(psw_arr[index2]), byteArray,byteArray2]);
        const signedPackage2 = (crc16(Uint8Array.from(joinedList2))>>8).toString(16);

       
      
        console.log(signedPackage+signedPackage2);
        const result = signedPackage+signedPackage2;

        if((userPassword==pwdUser))
        {
        const newEntry = new PasswordModel({ deviceInfo1: hexString, deviceInfo2:hexString2,passwordOption:passwordOption,passwordOption2:passwordOption2,finalPsw:result});
        await newEntry.save();
        }
        
        res.json({ message: 'Şifre işlendi', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
        console.log(err);
    }
}else
{
    return res.status(400).json({ error: 'Hatalı Kullanıcı Şifresi' });
    
}
});

// HTML Sayfası Servis Etme
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});


