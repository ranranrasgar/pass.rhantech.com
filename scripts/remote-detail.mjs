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
    echo "=== DOCKER CONTAINERS (FORMATTED) ==="
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
    
    echo "=== ACTIVE TCP LISTENING PORTS ==="
    ss -tlpn | grep LISTEN
    
    echo "=== NGINX SITES-ENABLED ==="
    ls -la /etc/nginx/sites-enabled/
    
    echo "=== POSTGRES/MYSQL IN DOCKER OR HOST ==="
    docker ps | grep -E "postgres|mysql|mariadb|db" || echo "No DB containers found"
  `;

  conn.exec(commands, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).connect(config);
