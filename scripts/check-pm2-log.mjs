import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('pm2 logs pass-venue --lines 30 --nostream', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({
  host: '76.13.19.163',
  port: 22,
  username: 'root',
  password: '12345Rhnsft@',
});
