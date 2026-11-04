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
    echo "=== /etc/nginx/sites-available/app.rhantech.com ==="
    cat /etc/nginx/sites-available/app.rhantech.com 2>/dev/null || cat /etc/nginx/sites-available/rhantech.com
    
    echo "=== CHECK IF PORT 3650 and 5433 ARE FREE ==="
    ss -tlpn | grep -E ":3650 |:5433 " || echo "Ports 3650 and 5433 are FREE"
    
    echo "=== CHECK DNS pass.rhantech.com ==="
    nslookup pass.rhantech.com 8.8.8.8 2>/dev/null || dig +short pass.rhantech.com 2>/dev/null || getent hosts pass.rhantech.com || echo "Cannot resolve pass.rhantech.com"
  `;

  conn.exec(commands, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).connect(config);
