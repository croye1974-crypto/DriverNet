import WebSocket from 'ws';

const SERVER = process.env.WS || 'ws://localhost:5000';
const N = parseInt(process.env.CLIENTS || '100', 10);

function jitter(base: number) {
  return base + (Math.random() - 0.5) * 0.01;
}

console.log(`Starting ${N} WebSocket clients to ${SERVER}...`);

for (let i = 0; i < N; i++) {
  const ws = new WebSocket(SERVER);
  const baseLat = 51.50 + Math.random() * 0.1;
  const baseLng = -0.14 + Math.random() * 0.1;

  ws.on('open', () => {
    console.log(`Client ${i + 1} connected`);
    setInterval(() => {
      const msg = JSON.stringify({
        type: 'location',
        lat: jitter(baseLat),
        lng: jitter(baseLng),
      });
      ws.send(msg);
    }, 1500 + Math.random() * 1500);
  });

  ws.on('error', (err) => {
    console.error(`Client ${i + 1} error:`, err.message);
  });

  ws.on('close', () => {
    console.log(`Client ${i + 1} disconnected`);
  });
}
