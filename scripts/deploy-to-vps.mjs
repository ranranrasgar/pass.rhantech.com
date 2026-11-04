import { Client } from 'ssh2';
import fs from 'fs';
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
      stream.on('close', (code, signal) => {
        if (code !== 0) {
          console.error(`Command exited with code ${code}`);
        }
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
  console.log('=== SSH CONNECTED TO 76.13.19.163 ===');

  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }

    try {
      // 1. Upload files to /tmp
      const deployArchive = path.resolve('deploy.tar.gz');
      const dbDump = path.resolve('backups/venuepass-20261104-154309.dump');

      await sftpUpload(sftp, deployArchive, '/tmp/deploy.tar.gz');
      await sftpUpload(sftp, dbDump, '/tmp/venuepass.dump');

      // 2. Setup PostgreSQL container (on isolated port 5433)
      const setupDbScript = `
        set -e
        echo "--- CHECK / START POSTGRES CONTAINER ---"
        if [ "$(docker ps -q -f name=venuepass-db)" ]; then
            echo "venuepass-db already running"
        elif [ "$(docker ps -aq -f name=venuepass-db)" ]; then
            echo "Starting existing venuepass-db..."
            docker start venuepass-db
        else
            echo "Creating new venuepass-db container..."
            docker run -d --name venuepass-db --restart unless-stopped \
              -p 127.0.0.1:5433:5432 \
              -e POSTGRES_DB=venuepass \
              -e POSTGRES_USER=venuepass \
              -e POSTGRES_PASSWORD=VenuePass2026! \
              -v venuepass_db_data:/var/lib/postgresql/data \
              postgres:16-alpine
        fi

        # Wait until PostgreSQL is ready
        echo "Waiting for postgres to accept connections..."
        until docker exec venuepass-db pg_isready -U venuepass; do
          sleep 1
        done

        # Restore database dump
        echo "Restoring venuepass database..."
        docker exec -i venuepass-db pg_restore -U venuepass -d venuepass --clean --no-owner < /tmp/venuepass.dump || true
        
        # Verify table count
        echo "Checking tables in venuepass database:"
        docker exec venuepass-db psql -U venuepass -d venuepass -c "\\dt"
      `;
      await execCommand(conn, setupDbScript);

      // 3. Extract standalone build & setup PM2
      const setupAppScript = `
        set -e
        echo "--- EXTRACTING STANDALONE BUILD ---"
        mkdir -p /var/www/pass.rhantech.com
        rm -rf /var/www/pass.rhantech.com/*
        tar -xzf /tmp/deploy.tar.gz -C /var/www/pass.rhantech.com/
        
        echo "Extracted files:"
        ls -la /var/www/pass.rhantech.com/
        
        echo "--- STARTING APP WITH PM2 ---"
        cd /var/www/pass.rhantech.com
        pm2 delete pass-venue 2>/dev/null || true
        pm2 start server.js --name "pass-venue" --cwd /var/www/pass.rhantech.com
        pm2 save
        
        sleep 3
        pm2 status pass-venue
        
        echo "--- TESTING LOCAL HTTP REQUEST ON PORT 3650 ---"
        curl -I http://127.0.0.1:3650/login || echo "App not responding yet on 3650"
      `;
      await execCommand(conn, setupAppScript);

      // 4. Configure Nginx
      const setupNginxScript = `
        set -e
        echo "--- CONFIGURING NGINX ---"
        cat << 'EOF' > /etc/nginx/sites-available/pass.rhantech.com
server {
    server_name pass.rhantech.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3650;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
    }

    listen 80;
}
EOF
        ln -sf /etc/nginx/sites-available/pass.rhantech.com /etc/nginx/sites-enabled/
        nginx -t
        systemctl reload nginx
        
        echo "--- TESTING NGINX PROXY LOCALLY ---"
        curl -I -H "Host: pass.rhantech.com" http://127.0.0.1/login
      `;
      await execCommand(conn, setupNginxScript);

      console.log('\n=== DEPLOYMENT COMPLETED SUCCESSFULLY ===');
    } catch (e) {
      console.error('Deployment error:', e);
    } finally {
      conn.end();
    }
  });
}).connect(config);
