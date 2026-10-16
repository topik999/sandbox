const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const rooms = new Map();
const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname === '/') pathname = '/sandbox.html';
  const file = path.join(ROOT, pathname.replace(/^\/+/, ''));
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'sandbox.html')) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('File not found: ' + pathname); }
    const ext = path.extname(file);
    const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
    res.writeHead(200, {'Content-Type':types[ext] || 'application/octet-stream','Cache-Control':'no-cache'}); res.end(data);
  });
});
const wss = new WebSocket.Server({server});
function send(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function broadcast(room, data, except) { for (const client of (rooms.get(room) || new Set())) if (client !== except) send(client, data); }
wss.on('connection', ws => {
  ws.room = null; ws.player = null;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.type === 'create' || m.type === 'join') {
      if (ws.room) return;
      const room = String(m.room || '').trim().slice(0,40);
      if (!room) { send(ws, {type:'error', message:'Введи название комнаты.'}); return; }
      if (m.type === 'create' && rooms.has(room)) { send(ws, {type:'error', message:'Комната уже существует. Выбери другое название или подключись к ней.'}); return; }
      if (m.type === 'join' && !rooms.has(room)) { send(ws, {type:'error', message:'Такой комнаты нет. Попроси друга сначала нажать «Создать сервер».'}); return; }
      const id = String(m.id || Math.random().toString(36).slice(2)).slice(0,40);
      ws.room = room; ws.isHost = m.type === 'create'; ws.player = {id, nick:String(m.nick || 'Player').slice(0,14), x:0,y:1.7,z:0,yaw:0,m:'hev'};
      if (!rooms.has(room)) rooms.set(room, new Set());
      const peers = rooms.get(room);
      send(ws, {type:'welcome', players:[...peers].map(c=>c.player).filter(Boolean)});
      peers.add(ws);
      if (m.type === 'create') send(ws, {type:'room_created', room});
      broadcast(room, {type:'joined', ...ws.player}, ws);
      broadcast(room,{type:'count',count:peers.size});
      console.log(`[${room}] ${ws.player.nick} ${m.type==='create'?'created room':'joined'} (${peers.size})`); return;
    }
    if (!ws.room || !ws.player) return;
    if (m.type === 'state') {
      ws.player = {...ws.player, x:num(m.x), y:num(m.y,1.7), z:num(m.z), yaw:num(m.yaw), m:String(m.m||'hev').slice(0,24), nick:ws.player.nick};
      broadcast(ws.room, {type:'state',...ws.player}, ws); return;
    }
    if (m.type === 'world_event') {
      // Relay bounded world changes (spawn/remove) to every player in this room.
      const event = m.event;
      if (!event || typeof event !== 'object') return;
      const encoded = JSON.stringify(event);
      if (encoded.length > 12000) return;
      broadcast(ws.room, {type:'world_event', from:ws.player.id, event}, null);
      return;
    }
    if (m.type === 'world_state') {
      // Only the room creator is authoritative for periodic world positions.
      if (!ws.isHost || !m.state || typeof m.state !== 'object') return;
      const state = {
        props: Array.isArray(m.state.props) ? m.state.props.slice(0,250) : [],
        npcs: Array.isArray(m.state.npcs) ? m.state.npcs.slice(0,100) : [],
        vehicles: Array.isArray(m.state.vehicles) ? m.state.vehicles.slice(0,80) : []
      };
      broadcast(ws.room, {type:'world_state', state}, ws);
      return;
    }
    if (m.type === 'chat') {
      const txt=String(m.txt||'').slice(0,240); if(txt) broadcast(ws.room,{type:'chat',nick:ws.player.nick,txt},null);
    }
  });
  ws.on('close', () => { if(!ws.room)return; const room=ws.room, id=ws.player?.id; const peers=rooms.get(room); if(peers){peers.delete(ws);broadcast(room,{type:'left',id},null);if(peers.size)broadcast(room,{type:'count',count:peers.size});else rooms.delete(room)} console.log(`[${room}] ${ws.player?.nick||id} disconnected`); });
});
function num(v, fallback=0) { const n=Number(v); return Number.isFinite(n) ? Math.max(-10000,Math.min(10000,n)) : fallback; }
server.listen(PORT,'0.0.0.0',()=>console.log(`Sandbox Node.js multiplayer running at http://localhost:${PORT}\nFor LAN play, friends can connect to this computer's IP on port ${PORT}.`));
