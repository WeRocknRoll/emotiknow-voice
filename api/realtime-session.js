<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>EmotiKnow — Companion Kit</title>
<style>
  :root{--bg:#0f1117;--panel:#151b23;--ink:#e6e8ef;--muted:#9aa3b2}
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--ink);font:500 15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial;display:grid;place-items:start center;padding:18px}
  .wrap{width:min(1200px,100%);display:grid;gap:14px}
  .panel{background:var(--panel);border:1px solid #202937;border-radius:14px;padding:14px}
  h1{margin:0 0 6px;font-weight:800}
  .row{display:grid;grid-template-columns:1fr 380px;gap:14px}
  @media(max-width:980px){.row{grid-template-columns:1fr}}
  .stage{position:relative;aspect-ratio:16/10;overflow:hidden;border-radius:12px;background:#000;display:grid;place-items:center}
  #portrait{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform-origin:50% 60%}
  #mouth{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(1);width:260px;pointer-events:none}
  #remoteAudio{display:none}
  .controls{display:grid;gap:10px}
  .grid{display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:10px}
  label{font-size:12px;color:var(--muted)}
  input[type=range],select,button{width:100%}
  select,button{background:#101826;border:1px solid #273142;color:var(--ink);border-radius:10px;padding:10px;font-weight:700}
  button.primary{background:#2446ff;border-color:#2446ff;color:#fff}
  button:disabled{opacity:.6;cursor:not-allowed}
  .diag{font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;background:#0b0e16;border:1px solid #20283a;border-radius:10px;padding:10px;height:300px;overflow:auto;white-space:pre-wrap}
  .muted{color:var(--muted);font-size:13px}
</style>
</head>
<body>
<div class="wrap">
  <div class="panel">
    <h1>EmotiKnow — Companion Kit</h1>
    <div class="grid">
      <div>
        <label>Companion</label>
        <select id="personaSel">
          <option value="emma" selected>Emma (warm)</option>
          <option value="dr_summerlin">Dr. Michael Summerlin</option>
        </select>
      </div>
      <div>
        <label>Voice</label>
        <select id="voiceSel">
          <option value="verse">Verse (warm)</option>
          <option value="shimmer">Shimmer (bright)</option>
          <option value="alloy">Alloy (clear)</option>
        </select>
      </div>
    </div>
    <div class="muted" style="margin-top:6px">Click the real mouth once to anchor. Then press <b>Start</b>.</div>
  </div>

  <div class="row">
    <div class="panel">
      <div id="stage" class="stage">
        <img id="portrait" src="/m.png" alt="portrait"/>
        <img id="mouth" alt="mouth"/>
        <audio id="remoteAudio" autoplay playsinline></audio>
      </div>
      <div class="controls" style="margin-top:10px">
        <div class="grid">
          <button id="startBtn" class="primary">Start</button>
          <button id="hangBtn">Hang Up</button>
        </div>
        <div class="grid">
          <div><label>Target width <span id="wOut">260 px</span></label><input id="wRange" type="range" min="120" max="720" value="260"></div>
          <div><label>Scale <span id="sOut">100 %</span></label><input id="sRange" type="range" min="70" max="160" value="100"></div>
          <div><label>Smooth <span id="smOut">0.85</span></label><input id="smRange" type="range" min="0.60" max="0.95" step="0.01" value="0.85"></div>
          <div><label>Gate <span id="gOut">0.15</span></label><input id="gRange" type="range" min="0.05" max="0.30" step="0.01" value="0.15"></div>
        </div>
        <div class="muted">Idle guard: auto-hangup after ~90s of silence. Auto-reconnect if network drops.</div>
      </div>
    </div>

    <div class="panel">
      <div class="muted" style="margin-bottom:6px">Diagnostics</div>
      <div id="log" class="diag">[app] loading…</div>
    </div>
  </div>
</div>

<script>
(() => {
  const $ = s => document.querySelector(s);
  const logEl = $('#log');
  const log = (...a) => { logEl.textContent += a.join(' ') + '\\n'; logEl.scrollTop = logEl.scrollHeight; };

  // UI
  const personaSel = $('#personaSel'), voiceSel = $('#voiceSel');
  const portrait = $('#portrait'), mouth = $('#mouth'), stage = $('#stage');
  const startBtn = $('#startBtn'), hangBtn = $('#hangBtn');
  const wRange = $('#wRange'), sRange = $('#sRange'), smRange = $('#smRange'), gRange = $('#gRange');
  const wOut = $('#wOut'), sOut = $('#sOut'), smOut = $('#smOut'), gOut = $('#gOut');
  const remoteAudio = $('#remoteAudio');

  // State
  let persona = null;
  let anchor = null;
  let pc = null, micStream = null, remoteStream = null, raf=0;
  let vuEMA = 0; // smoothed loudness
  let idleMs = 0; const IDLE_LIMIT = 90000; // 90s
  let reconnecting = false;

  // Blink / head-bob
  let blinkTimer = 0, nextBlinkAt = 3000;
  let bobPhase = 0;

  // Frames
  const frames = {};
  function loadFrames(list, base) {
    return Promise.all(list.map(n => new Promise(res=>{
      const im = new Image();
      im.onload = () => { frames[n]=im; res(); };
      im.onerror = () => { log('[warn] missing', base+n+'.png'); res(); };
      im.src = base + n + '.png';
    })));
  }

  function applySliders() {
    wOut.textContent = wRange.value + ' px';
    sOut.textContent = sRange.value + ' %';
    smOut.textContent = (+smRange.value).toFixed(2);
    gOut.textContent  = (+gRange.value).toFixed(2);
    mouth.style.width = wRange.value + 'px';
    mouth.style.transform = `translate(-50%,-50%) scale(${(+sRange.value)/100})`;
  }
  [wRange,sRange,smRange,gRange].forEach(r=>r.addEventListener('input', applySliders));

  function placeMouth() {
    const r = stage.getBoundingClientRect();
    const x = (anchor?.x ?? persona.mouth.defaultAnchor.x) * r.width;
    const y = (anchor?.y ?? persona.mouth.defaultAnchor.y) * r.height;
    mouth.style.left = x + 'px';
    mouth.style.top  = y + 'px';
  }
  new ResizeObserver(placeMouth).observe(stage);

  stage.addEventListener('click', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left)/r.width;
    const y = (e.clientY - r.top )/r.height;
    anchor = {x,y};
    localStorage.setItem('ck_anchor_'+persona.id, JSON.stringify(anchor));
    placeMouth(); log('[anchor] saved', JSON.stringify(anchor));
  });

  async function loadPersona(id){
    const res = await fetch('/personas/'+id+'.json');
    persona = await res.json();
    voiceSel.value = persona.voice || 'verse';
    portrait.src = persona.portrait || '/m.png';
    // restore anchor
    try { anchor = JSON.parse(localStorage.getItem('ck_anchor_'+persona.id)); } catch {}
    // apply tuning
    wRange.value  = persona.mouth.defaultWidth ?? 260;
    sRange.value  = persona.mouth.defaultScalePct ?? 100;
    smRange.value = persona.mouth.smooth ?? 0.85;
    gRange.value  = persona.mouth.gate ?? 0.15;
    applySliders();
    // load frames
    await loadFrames(persona.mouth.frameSet, persona.mouth.framesPath);
    mouth.src = (frames['m']||frames['u']||Object.values(frames)[0])?.src || '';
    placeMouth();
    scheduleNextBlink();
    log('[persona] loaded', persona.displayName);
  }

  function scheduleNextBlink(){
    const [a,b] = persona.idle?.blinkEverySec || [3,7];
    nextBlinkAt = (a + Math.random()*(b-a)) * 1000;
    blinkTimer = 0;
  }

  function lipsFromVU() {
    // compute mouth frame from vuEMA (0..~0.6 typical)
    const gate = +gRange.value; let v = Math.max(0, (vuEMA - gate) / Math.max(0.0001, 1-gate));
    const S = persona.mouth.sensitivity ?? 1.0; v *= S;
    let key = 'm';
    if (v > 0.10) key='i';
    if (v > 0.18) key='say';
    if (v > 0.28) key='o';
    if (v > 0.38) key='u';
    // fallbacks
    if (!frames[key]) key = frames['u'] ? 'u' : Object.keys(frames)[0];
    mouth.src = frames[key]?.src || mouth.src;
  }

  function animate(dt) {
    // head-bob (gentle translateY)
    const bobPx = persona.idle?.headBobPx ?? 1.0;
    const bobSp = persona.idle?.headBobSpeed ?? 0.6;
    bobPhase += dt * bobSp;
    const bobY = Math.sin(bobPhase) * bobPx;
    portrait.style.transform = `translateY(${bobY}px)`;

    // blink (opacity dip on mouth to simulate eyelid? Or briefly swap to 'm' tighter)
    blinkTimer += dt*1000;
    if (blinkTimer >= nextBlinkAt) {
      // brief blink: scale mouth tiny to soften face (cheap illusion)
      mouth.style.opacity = '0.85';
      setTimeout(()=>{ mouth.style.opacity = '1'; }, 120);
      scheduleNextBlink();
    }
  }

  function startVU(stream){
    const ac = new (window.AudioContext||window.webkitAudioContext)();
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser(); an.fftSize = 1024;
    const buf = new Uint8Array(an.fftSize);
    src.connect(an);
    const SMOOTH = +smRange.value;

    let last = performance.now();
    function loop(t){
      const dt = (t-last)/1000; last = t;
      an.getByteTimeDomainData(buf);
      let sum=0; for (let i=0;i<buf.length;i++){ const v=(buf[i]-128)/128; sum+=v*v; }
      let rms = Math.sqrt(sum/buf.length);
      // smooth lips
      vuEMA = SMOOTH*vuEMA + (1-SMOOTH)*rms;
      lipsFromVU();
      animate(dt);

      // idle detector (if mic rms + returned audio too low, increment; else reset)
      if (rms < 0.02) idleMs += dt*1000; else idleMs = 0;
      if (idleMs > IDLE_LIMIT) { log('[idle] timeout — hanging up'); hangup(); return; }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  async function start(){
    try{
      startBtn.disabled = true; hangBtn.disabled = false;
      // mic
      log('[mic] requesting…');
      micStream = await navigator.mediaDevices.getUserMedia({ audio:true });
      log('[mic] granted.');

      // pc
      pc = new RTCPeerConnection();
      micStream.getTracks().forEach(t => pc.addTrack(t, micStream));
      remoteStream = new MediaStream();
      pc.ontrack = (e)=>{
        if (e.track.kind==='audio'){ remoteStream.addTrack(e.track); remoteAudio.srcObject = remoteStream; remoteAudio.play().catch(()=>{}); }
      };
      pc.onconnectionstatechange = () => {
        log('[pc]', pc.connectionState);
        if (['disconnected','failed'].includes(pc.connectionState) && !reconnecting) {
          reconnecting = true; log('[reconnect] restarting…'); hangup(true); start();
        }
      };

      // offer
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      // token
      const tokRes = await fetch('/api/realtime-session', { method:'POST' });
      const tok = await tokRes.json();
      if (!tokRes.ok || !tok?.client_secret?.value) throw new Error('token failed');

      // include persona system message via initial instructions header (optional pattern)
      const model = tok.model || 'gpt-4o-mini-realtime-preview';
      const sdpRes = await fetch('https://api.openai.com/v1/realtime?model='+encodeURIComponent(model), {
        method:'POST',
        headers:{
          'Authorization': 'Bearer ' + tok.client_secret.value,
          'Content-Type': 'application/sdp',
          'X-OpenAI-System-Prompt': persona.system || ''
        },
        body: offer.sdp
      });
      const answer = await sdpRes.text();
      if (!sdpRes.ok || !answer.startsWith('v=')) throw new Error('SDP failed');

      await pc.setRemoteDescription({ type:'answer', sdp: answer });
      log('[sdp] handshake complete.');
      // kick VU → lips
      startVU(remoteAudio.srcObject || micStream);

      // send a friendly greeting line (optional small prompt via data channel could be used; here we rely on Realtime intro)
      log('[greet]', persona.greeting);
    } catch(e){
      log('[ERROR]', e.message||e); hangup();
    }
  }

  function hangup(keepUI=false){
    try { if (raf) cancelAnimationFrame(raf); raf=0; } catch{}
    try { pc?.close(); } catch{} pc=null;
    try { micStream?.getTracks().forEach(t=>t.stop()); } catch{} micStream=null;
    reconnecting = false; idleMs = 0;
    if (!keepUI) { startBtn.disabled = false; hangBtn.disabled = true; }
    log('[call] ended.');
  }

  startBtn.onclick = start;
  hangBtn.onclick  = () => hangup();

  personaSel.onchange = async () => { await loadPersona(personaSel.value); };
  voiceSel.onchange = () => { /* reserved if you later pass voice to backend */ };

  // Boot
  loadPersona(personaSel.value);
})();
</script>
</body>
</html>
