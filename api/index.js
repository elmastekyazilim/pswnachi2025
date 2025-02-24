const express = require('express');
const path = require('path');
const serverless = require('serverless-http');

const app = express();

// Statik dosyaları servis et
app.use(express.static(path.join(__dirname, '../public')));

// Ana sayfayı `/` isteği geldiğinde sun
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serverless fonksiyon olarak dışa aktar
module.exports = serverless(app);