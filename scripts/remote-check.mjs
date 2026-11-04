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
  console.log('=== SSH CONNECTION SUCCESSFUL ===');
  const commands = `
    echo "--- OS & UPTIME ---"
    cat /etc/os-release | grep PRETTY_NAME
    uname -a
    uptime
    
    echo "--- MEMORY & DISK ---"
    free -h
    df -h /
    
    echo "--- LISTENING PORTS (ss -tulnp) ---"
    ss -tulnp || netstat -tulnp
    
    echo "--- DOCKER CONTAINERS ---"
    which docker && docker ps || echo "No docker or not running"
    
    echo "--- PM2 APPS ---"
    which pm2 && pm2 list || echo "PM2 not installed/running"
    
    echo "--- WEB SERVERS ---"
    systemctl is-active nginx apache2 caddy lsws 2>/dev/null
    
    echo "--- NODE / NPM / POSTGRES ---"
    node -v 2>/dev/null || echo "Node not found"
    npm -v 2>/dev/null || echo "Npm not found"
    psql --version 2>/dev/null || echo "PostgreSQL not found"
    systemctl is-active postgresql 2>/dev/null || echo "PostgreSQL service not active"
  `;

  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('Command finished with code', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection error:', err);
}).connect(config);
