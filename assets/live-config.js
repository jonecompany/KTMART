(function(){
  window.KTMART_ADMIN_CONFIG = window.KTMART_ADMIN_CONFIG || {};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function multiline(s){return esc(s).replace(/\n/g,'<br>')}
  function campaignLocked(){return document.body&&document.body.dataset.campaignLock==='iphone18'}
  function patchHero(){
    if(campaignLocked())return;
    var slides=window.KTMART_ADMIN_CONFIG.heroSlides;
    if(!Array.isArray(slides)||!slides.length)return;
    var els=[].slice.call(document.querySelectorAll('.hero-slide'));
    slides.forEach(function(s,i){
      var el=els[i]; if(!el)return;
      var kicker=el.querySelector('.hero-kicker'), h1=el.querySelector('h1'), p=el.querySelector('.hero-copy p');
      if(kicker) kicker.textContent=s.kicker||'';
      if(h1) h1.innerHTML=multiline(s.title||'');
      if(p){p.innerHTML=multiline(s.subtitle||'')+(s.note?'<span class="hero-subnote '+(i===3?'light':'')+'">'+esc(s.note)+'</span>':'')}
      var btns=el.querySelectorAll('.hero-actions a');
      if(btns[0]){btns[0].textContent=s.button1Text||btns[0].textContent;btns[0].href=s.button1Url||btns[0].getAttribute('href')}
      if(btns[1]){btns[1].textContent=s.button2Text||btns[1].textContent;btns[1].href=s.button2Url||btns[1].getAttribute('href')}
      var imgs=el.querySelectorAll('.hero-media img');
      if(imgs[0]&&s.image)imgs[0].src=s.image;
      if(imgs[1]&&s.image2)imgs[1].src=s.image2;
      el.style.display=s.enabled===false?'none':'';
    });
    var visible=els.filter(function(x){return x.style.display!=='none'});
    var dots=document.querySelector('.hero-dots');
    if(dots&&visible.length){dots.innerHTML=visible.map(function(_,i){return '<button class="hero-dot '+(i===0?'active':'')+'"></button>'}).join('')}
  }
  function patchEvents(){
    if(campaignLocked())return;
    var events=window.KTMART_ADMIN_CONFIG.events;
    var grid=document.querySelector('body[data-page="events"] .event-grid');
    if(!grid||!Array.isArray(events))return;
    grid.innerHTML=events.filter(function(x){return x&&x.enabled!==false}).map(function(e){
      var media=e.image?'<img src="'+esc(e.image)+'" alt="'+esc(e.title)+'">':'<div style="height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#ed1c24,#8e0010);color:#fff;font-size:34px;font-weight:900">'+esc(e.kicker||'KT마트')+'</div>';
      return '<a class="event-card" href="'+esc(e.url||'consult.html')+'"><div class="event-img">'+media+'</div><div class="event-copy"><span>'+esc(e.kicker||'EVENT')+'</span><h3>'+esc(e.title||'이벤트')+'</h3><p>'+esc(e.description||'')+'</p></div></a>';
    }).join('');
  }

  function patchStoresAndContact(){
    var site=window.KTMART||{}, stores=site.stores||[];
    var cards=document.querySelector('.store-cards');
    if(cards&&stores.length){cards.innerHTML=stores.map(function(st,i){return '<article class="store-card"><span class="store-no">STORE '+String(i+1).padStart(2,'0')+'</span><h3>'+esc(st.name||'KT 매장')+'</h3><p class="location">'+multiline(st.address||'')+'</p><a class="phone" href="tel:'+esc(st.phone||site.phone||'')+'">'+esc(st.phone||site.phone||'')+'</a><a class="store-link" href="consult.html?store='+encodeURIComponent(st.name||'매장')+'">상담 신청 →</a></article>'}).join('')}
    var side=document.querySelector('.consult-side');
    if(side&&stores.length){var old=side.querySelectorAll('.side-store');old.forEach(function(x){x.remove()});stores.forEach(function(st){var d=document.createElement('div');d.className='side-store';d.innerHTML='<b>'+esc(st.name||'KT 매장')+'</b><span>'+multiline(st.address||'')+'<br>'+esc(st.phone||site.phone||'')+'</span>';side.appendChild(d)})}
    var form=document.querySelector('#consultForm');if(form&&site.email)form.action='https://formsubmit.co/'+encodeURIComponent(site.email);
    document.querySelectorAll('a[href="https://open.kakao.com/o/scIxquKi"]').forEach(function(a){if(site.kakao)a.href=site.kakao});
    var speed=document.querySelector('.speed-delivery small');if(speed&&site.shipping)speed.textContent=site.shipping;
  }

  function patchHomepageStrip(){
    if(campaignLocked())return;
    var c=window.KTMART_ADMIN_CONFIG.homeStrip;
    var el=document.querySelector('.iphone18-strip'); if(!el||!c)return;
    var st=el.querySelector('strong'), sp=el.querySelector('span'), a=el.querySelector('a');
    if(st&&c.title)st.textContent=c.title;if(sp&&c.text)sp.textContent=c.text;if(a){if(c.buttonText)a.textContent=c.buttonText;if(c.url)a.href=c.url}
    el.style.display=c.enabled===false?'none':'';
  }
  document.addEventListener('DOMContentLoaded',function(){patchHero();patchEvents();patchHomepageStrip();patchStoresAndContact()});
})();
