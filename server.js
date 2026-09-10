const express = require('express');
const useragent = require('express-useragent');
const path = require('path');

const app = express();
const PORT = 3000;

let logs = [];

app.use(express.json());
app.use(useragent.express());

// 메인 페이지 (index.html 전달)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 클라이언트 데이터 수집 API
app.post('/api/log', (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.useragent;

    const logEntry = {
        time: new Date().toLocaleString(),
        ip: clientIp,
        os: ua.os,
        browser: ua.browser,
        ...req.body
    };

    logs.push(logEntry);
    console.log("새로운 접속 기록:", logEntry);
    res.sendStatus(200);
});

// 비밀 관리자 페이지 (수집된 기록 보기)
app.get('/secret-admin', (req, res) => {
    res.json(logs);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
