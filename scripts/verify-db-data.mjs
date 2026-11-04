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
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let output = '';
      stream.on('close', () => resolve(output))
        .on('data', d => output += d)
        .stderr.on('data', d => output += d);
    });
  });
}

conn.on('ready', async () => {
  try {
    const res = await execCommand(conn, `
      docker exec venuepass-db psql -U venuepass -d venuepass -c "
        SELECT 'users' as tbl, count(*) from users
        UNION ALL SELECT 'events', count(*) from events
        UNION ALL SELECT 'gates', count(*) from gates
        UNION ALL SELECT 'guests', count(*) from guests
        UNION ALL SELECT 'qr_credentials', count(*) from qr_credentials;
      "
    `);
    console.log(res);
  } finally {
    conn.end();
  }
}).connect(config);
