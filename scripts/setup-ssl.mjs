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
      certbot --nginx -d pass.rhantech.com --non-interactive --agree-tos -m admin@rhantech.com --redirect || {
        echo "Certbot failed, let's inspect nginx config"
      }
      nginx -t
      systemctl reload nginx
    `;

    await execCommand(conn, script);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    conn.end();
  }
}).connect(config);
