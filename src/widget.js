(function(){
  const BAGCRM_URL = 'https://grateful-compassion-production-3ef4.up.railway.app';
  
  // Create widget button
  const btn = document.createElement('div');
  btn.innerHTML = '💬';
  btn.style.cssText = `
    position:fixed;bottom:20px;right:20px;width:56px;height:56px;
    background:linear-gradient(135deg,#5B6AF1,#8B5CF6);
    border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:24px;cursor:pointer;z-index:99999;
    box-shadow:0 4px 20px rgba(91,106,241,0.5);
    transition:all 0.3s ease;
  `;

  // Create chat window
  const chat = document.createElement('div');
  chat.style.cssText = `
    position:fixed;bottom:90px;right:20px;width:360px;height:500px;
    background:#fff;border-radius:20px;
    box-shadow:0 20px 60px rgba(0,0,0,0.15);
    z-index:99998;display:none;flex-direction:column;
    overflow:hidden;border:1px solid #E4E8F0;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  `;

  chat.innerHTML = `
    <div style="background:linear-gradient(135deg,#5B6AF1,#8B5CF6);padding:20px;color:#fff;">
      <div style="font-size:18px;font-weight:800;margin-bottom:4px;">Bağ CRM</div>
      <div style="font-size:13px;opacity:0.85;">Sizə necə kömək edə bilərik?</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
        <div style="width:8px;height:8px;background:#4ade80;border-radius:50%;"></div>
        <span style="font-size:12px;opacity:0.9;">Online</span>
      </div>
    </div>
    <div id="bagcrm-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#F8FAFF;">
      <div style="background:#fff;border-radius:12px 12px 12px 4px;padding:12px 14px;font-size:14px;color:#0D1117;box-shadow:0 1px 4px rgba(0,0,0,0.06);max-width:80%;border:1px solid #E4E8F0;">
        Salam! 👋 Sizə necə kömək edə bilərəm?
      </div>
    </div>
    <div style="padding:12px;border-top:1px solid #E4E8F0;background:#fff;display:flex;gap:8px;">
      <input id="bagcrm-input" placeholder="Mesajınızı yazın..." style="flex:1;padding:10px 14px;border:1.5px solid #E4E8F0;border-radius:10px;font-size:14px;outline:none;font-family:inherit;"/>
      <button id="bagcrm-send" style="width:40px;height:40px;background:linear-gradient(135deg,#5B6AF1,#8B5CF6);border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    </div>
  `;

  let isOpen = false;
  let visitorId = localStorage.getItem('bagcrm_visitor') || Math.random().toString(36).substr(2,9);
  localStorage.setItem('bagcrm_visitor',visitorId);
  let conversationId = null;

  btn.onclick = () => {
    isOpen = !isOpen;
    chat.style.display = isOpen ? 'flex' : 'none';
    btn.innerHTML = isOpen ? '✕' : '💬';
    btn.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';
  };

  const addMessage = (text, isAgent=false) => {
    const msgs = document.getElementById('bagcrm-messages');
    const msg = document.createElement('div');
    msg.style.cssText = `
      background:${isAgent?'#fff':'linear-gradient(135deg,#5B6AF1,#8B5CF6)'};
      color:${isAgent?'#0D1117':'#fff'};
      border-radius:${isAgent?'12px 12px 12px 4px':'12px 12px 4px 12px'};
      padding:10px 14px;font-size:14px;
      max-width:80%;
      align-self:${isAgent?'flex-start':'flex-end'};
      box-shadow:0 1px 4px rgba(0,0,0,0.08);
      ${isAgent?'border:1px solid #E4E8F0;':''}
    `;
    msg.textContent = text;
    msgs.appendChild(msg);
    msgs.scrollTop = msgs.scrollHeight;
  };

  const sendMessage = async () => {
    const input = document.getElementById('bagcrm-input');
    const text = input.value.trim();
    if(!text) return;
    input.value = '';
    addMessage(text, false);

    try {
      const res = await fetch(`${BAGCRM_URL}/api/widget/message`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          visitorId,
          conversationId,
          message: text,
          url: window.location.href,
          title: document.title
        })
      });
      const data = await res.json();
      if(data.conversationId) conversationId = data.conversationId;
      if(data.reply) setTimeout(()=>addMessage(data.reply, true), 800);
    } catch(e) {
      setTimeout(()=>addMessage('Mesajınız göndərildi. Tezliklə cavab verəcəyik!', true), 800);
    }
  };

  document.getElementById && document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('bagcrm-send').onclick = sendMessage;
    document.getElementById('bagcrm-input').onkeydown = (e) => {
      if(e.key === 'Enter') sendMessage();
    };
  });

  document.body.appendChild(btn);
  document.body.appendChild(chat);
})();
