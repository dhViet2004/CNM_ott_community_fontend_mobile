// Script lấy IP LAN của máy và cập nhật vào .env
// Chạy: node scripts/update-env-ip.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

function getDefaultGatewayIP() {
  try {
    if (process.platform === 'win32') {
      const output = execSync('ipconfig', { encoding: 'utf8' });
      const match = output.match(/Default Gateway[.\s]*:\s*([\d.]+)/i);
      return match ? match[1].trim() : null;
    }
  } catch {}
  return null;
}

const lanIP = getLocalIP() || getDefaultGatewayIP();
if (!lanIP) {
  console.error('Không tìm được IP LAN. Hãy kiểm tra kết nối mạng.');
  process.exit(1);
}

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const updatedContent = envContent
  .replace(/EXPO_PUBLIC_API_URL=.*/g, `EXPO_PUBLIC_API_URL=http://${lanIP}:4000/api`)
  .replace(/EXPO_PUBLIC_SOCKET_URL=.*/g, `EXPO_PUBLIC_SOCKET_URL=http://${lanIP}:4000`);

fs.writeFileSync(envPath, updatedContent, 'utf8');
console.log(`Đã cập nhật .env với IP LAN: ${lanIP}`);
