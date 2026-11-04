import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '76.13.19.163',
  port: 22,
  username: 'root',
  password: '12345Rhnsft@',
  readyTimeout: 30000,
};

function execCommand(conn, command) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> EXECUTING:\n${command.trim()}\n`);
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let output = '';
      stream.on('close', (code) => {
        resolve({ code, output });
      }).on('data', (d) => {
        output += d;
        process.stdout.write(d);
      }).stderr.on('data', (d) => {
        output += d;
        process.stderr.write(d);
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('=== SSH CONNECTED ===');
  try {
    const script = `
      set -e
      echo "--- WRITING ECOSYSTEM.CONFIG.CJS ---"
      cat << 'EOF' > /var/www/pass.rhantech.com/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'pass-venue',
      script: 'server.js',
      cwd: '/var/www/pass.rhantech.com',
      env: {
        PORT: 3650,
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://venuepass:VenuePass2026!@127.0.0.1:5433/venuepass?schema=public',
        AUTH_SECRET: 'BbgVcbeQ4HqnWkeu7NdMdtSKJFH/xCK3IISemnL5YLA=',
        AUTH_TRUST_HOST: 'true',
        APP_TIMEZONE: 'Asia/Jakarta',
        QR_ENC_KEY: 'wu2V+FWtYdqyxfUkkBdqFjN3jy5TnIrrHusSZnWBAio=',
        SEED_ADMIN_NAME: 'Super Admin',
        SEED_ADMIN_EMAIL: 'admin@venuepass.local',
        SEED_ADMIN_PASSWORD: '8ZRFellblOoA',
      },
    },
  ],
};
EOF

      echo "--- RESTARTING PM2 ---"
      cd /var/www/pass.rhantech.com
      pm2 delete pass-venue || true
      pm2 start ecosystem.config.cjs
      pm2 save
      
      echo "Waiting 4s for server startup..."
      sleep 4
      
      echo "--- PM2 STATUS ---"
      pm2 status pass-venue
      
      echo "--- CHECK PORT 3650 ---"
      ss -tlpn | grep 3650 || echo "Port 3650 not listening"
      
      echo "--- TEST LOCAL CURL ON 3650 ---"
      curl -I http://127.0.0.1:3650/login
      
      echo "--- TEST VIA NGINX ---"
      curl -I -H "Host: pass.rhantech.com" http://127.0.0.1/login
    `;

    await execCommand(conn, script);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    conn.end();
  }
}).connect(config);
