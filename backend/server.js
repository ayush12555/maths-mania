// backend/server.js
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const fs = require('fs');

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// lowdb setup
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDB(){
  await db.read();
  db.data = db.data || { inquiries: [], users: [], vacancies: [] };
  // seed a vacancy
  if (!db.data.vacancies.length) {
    db.data.vacancies.push({
      id: nanoid(), title: "Maths Faculty (Part Time)", location: "Lucknow", type: "Teaching",
      desc: "Teach quantitative aptitude and reasoning. 2 years experience preferred."
    });
    db.data.vacancies.push({
      id: nanoid(), title: "Content Writer", location: "Remote", type: "Content",
      desc: "Create practice questions and explanations for SSC & Bank exams."
    });
    await db.write();
  }
}
initDB();

// API: submit inquiry
app.post('/api/inquiries', async (req,res)=>{
  const { name, phone, email, course, message } = req.body || {};
  if (!name || !phone || !course) return res.status(400).json({ ok:false, msg:'Name, phone and course required' });
  await db.read();
  const it = { id: nanoid(), name, phone, email: email||'', course, message: message||'', createdAt: new Date().toISOString(), status:'new' };
  db.data.inquiries.push(it);
  await db.write();
  return res.json({ ok:true, inquiry: it });
});

// API: create account (very basic)
app.post('/api/users/register', async (req,res)=>{
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok:false, msg:'Name, email, password required' });
  await db.read();
  if (db.data.users.find(u => u.email === email)) return res.status(400).json({ ok:false, msg:'Email exists' });
  const user = { id: nanoid(), name, email, phone:phone||'', password, createdAt: new Date().toISOString() };
  db.data.users.push(user);
  await db.write();
  return res.json({ ok:true, user: { id:user.id, name:user.name, email:user.email } });
});

// API: login (basic, no hashing — change for production)
app.post('/api/users/login', async (req,res)=>{
  const { email, password } = req.body || {};
  await db.read();
  const u = db.data.users.find(x => x.email === email && x.password === password);
  if (!u) return res.status(401).json({ ok:false, msg:'Invalid credentials' });
  return res.json({ ok:true, user: { id:u.id, name:u.name, email:u.email } });
});

// API: list vacancies / search
app.get('/api/vacancies', async (req,res)=>{
  const q = (req.query.q||'').toLowerCase();
  await db.read();
  let list = db.data.vacancies.slice();
  if (q) list = list.filter(v => (v.title + ' ' + v.desc + ' ' + v.location).toLowerCase().includes(q));
  return res.json({ ok:true, vacancies: list });
});

// Admin endpoints for inquiries (simple key)
const ADMIN_KEY = process.env.ADMIN_KEY || 'maths_mania_admin';
function checkAdmin(req){
  const key = req.headers['x-admin-key'] || req.query.key;
  return key === ADMIN_KEY;
}
app.get('/api/admin/inquiries', async (req,res)=>{
  if (!checkAdmin(req)) return res.status(401).json({ ok:false, msg:'Unauthorized' });
  await db.read();
  return res.json({ ok:true, inquiries: db.data.inquiries.slice().reverse() });
});
app.post('/api/admin/inquiry/:id/status', async (req,res)=>{
  if (!checkAdmin(req)) return res.status(401).json({ ok:false, msg:'Unauthorized' });
  const id = req.params.id, { status } = req.body;
  await db.read();
  const it = db.data.inquiries.find(x=>x.id===id);
  if (!it) return res.status(404).json({ ok:false, msg:'Not found' });
  it.status = status || it.status;
  await db.write();
  return res.json({ ok:true, inquiry: it });
});

// fallback to index
app.get('*', (req,res)=>{
  const index = path.join(__dirname, '../frontend/index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(404).send('Not found');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=>console.log(`Maths Mania backend running on port ${PORT}`));
