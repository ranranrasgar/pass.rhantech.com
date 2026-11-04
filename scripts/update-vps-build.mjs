import { Client } from 'ssh2';
import path from 'path';

const conn = new Client();

const config = {
  host: '76.13.19.163',
  port: 22,
  username: 'root',
  password: '12345Rhnsft@',
  readyTimeout: 30000,
};

function sftpUpload(sftp, localFile, remoteFile) {
  return new Promise((resolve, reject) => {
    console.log(`Uploading ${localFile} -> ${remoteFile}...`);
    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) return reject(err);
      console.log(`Upload complete: ${remoteFile}`);
      resolve();
    });
  });
}

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

  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }

    try {
      const deployArchive = path.resolve('deploy.tar.gz');
      await sftpUpload(sftp, deployArchive, '/tmp/deploy.tar.gz');

      const updateScript = `
        set -e
        echo "--- EXTRACTING NEW BUILD ---"
        tar -xzf /tmp/deploy.tar.gz -C /var/www/pass.rhantech.com/
        
        echo "--- ENSURING ECOSYSTEM CONFIG ---"
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
        pm2 restart pass-venue --update-env || pm2 start ecosystem.config.cjs
        pm2 save
        
        sleep 3
        pm2 status pass-venue
        
        rm -f /tmp/deploy.tar.gz
        echo "=== UPDATE COMPLETED SUCCESSFULLY ==="
      `;

      await execCommand(conn, updateScript);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      conn.end();
    }
  });
}).connect(config);
