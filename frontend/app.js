// frontend/app.js
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:4000' : '';

// Inquiry form
document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('inquiryForm');
  if (form){
    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const payload = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        course: document.getElementById('course').value,
        message: document.getElementById('message').value
      };
      const status = document.getElementById('status');
      status.textContent = 'Sending...';
      try {
        const res = await fetch(API_BASE + '/api/inquiries', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const d = await res.json();
        if (d.ok) { status.textContent = 'Inquiry sent!'; form.reset(); }
        else status.textContent = 'Error: '+(d.msg||'');
      } catch(e){ status.textContent = 'Network error'; }
      setTimeout(()=> status.textContent='', 3500);
    });
  }

  // admin load
  const loadBtn = document.getElementById('loadBtn');
  if (loadBtn){
    loadBtn.addEventListener('click', async ()=>{
      const key = document.getElementById('adminKey').value;
      const list = document.getElementById('adminList');
      list.innerHTML = 'Loading...';
      try{
        const res = await fetch(API_BASE + '/api/admin/inquiries?key=' + encodeURIComponent(key));
        const d = await res.json();
        if (!d.ok) return list.innerHTML = '<div style="color:salmon">Unauthorized</div>';
        if (!d.inquiries.length) return list.innerHTML = '<div>No inquiries</div>';
        list.innerHTML = '';
        d.inquiries.forEach(i=>{
          const node = document.createElement('div');
          node.className = 'inq';
          node.innerHTML = `<strong>${escapeHtml(i.name)}</strong> • ${escapeHtml(i.course)}<br/><small>${escapeHtml(i.phone)} • ${escapeHtml(i.email||'')}</small><div style="margin-top:6px">${escapeHtml(i.message||'')}</div>
            <div style="margin-top:6px"><button onclick="updateStatus('${i.id}','contacted')">Mark Contacted</button> <button onclick="updateStatus('${i.id}','closed')">Close</button></div>`;
          list.appendChild(node);
        });
      }catch(e){ list.innerHTML = 'Failed to load'; }
    });
  }
});

async function updateStatus(id,status){
  const key = document.getElementById('adminKey').value;
  try{
    const res = await fetch(API_BASE + `/api/admin/inquiry/${id}/status?key=${encodeURIComponent(key)}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status })
    });
    const d = await res.json();
    if (d.ok) document.getElementById('loadBtn').click();
    else alert('Error');
  }catch(e){ alert('Network error'); }
}

function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<"'>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

// helper UI functions (from index references)
function openLogin(){ window.location.href = 'exam-before.html'; }
function scrollToContact(){ document.getElementById('contact')?.scrollIntoView({behavior:'smooth'}); }
