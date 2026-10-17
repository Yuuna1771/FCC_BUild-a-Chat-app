import http from 'http';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3001;

// 1. Create the HTTP server to serve index.html
const server = http.createServer((req, res) => {
  fs.readFile('./public/index.html', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

// 2. Instantiate the WebSocket Server linked to the HTTP server
const wss = new WebSocketServer({ server });

// Helper function to broadcast JSON stringified objects to all active connections
function broadcast(messageObj) {
  const jsonString = JSON.stringify(messageObj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonString);
    }
  });
}

// 3. Register the 'connection' listener lifecycle
wss.on('connection', (socket, req) => {
  // 4. Parse the username query parameter
  const username = new URL(req.url, 'http://localhost').searchParams.get('username');

  // Immediately broadcast a system message about the new user joining
  broadcast({ type: 'system', text: `${username} joined` });

  // 5. Handle incoming chat messages
  socket.on('message', (data) => {
    try {
      const parsedData = JSON.parse(data.toString());
      // Broadcast chat messages back out to everyone (including sender)
      broadcast({
        type: 'chat',
        username: parsedData.username,
        text: parsedData.text,
      });
    } catch (err) {
      console.error('Failed to process message:', err);
    }
  });

  // 6. Handle client disconnect cleanups
  socket.on('close', () => {
    // Broadcast a system message detailing the exit
    broadcast({ type: 'system', text: `${username} left` });
  });
});

// 7. Bind the server pipeline to the required port
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
