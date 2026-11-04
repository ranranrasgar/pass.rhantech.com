import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '76.13.19.163',
  port: 22,
  username: 'root',
  password: '12345Rhnsft@',
  readyTimeout: 20000,
};

conn.on('ready', () => {
  const commands = `
    dig +short NS rhantech.com
    certbot --version 2>/dev/null || echo "No certbot"
  `;

  conn.exec(commands, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).connect(config);
