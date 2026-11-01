/* Jaras Motion 01: purely observational, no game callbacks are replaced.
 * Does not write storage, scores, answers, timers, randomness, or sound.
 * No animation completion callback gates gameplay. Animations are cancellable.
 */
(() => {
  'use strict';
  if (window.JarasMotion) return;
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ownAnimations = new Set();
  const activeByNode = new WeakMap();
  const pageState = new Map(), answerState = new Map(), faceState = new Map();
  const counters = Object.create(null);
  let enabled = false, ready = false, queued = false, observer;
  let lastScores = [], lastQuestion = '', lastStrikes = '', lastAttempt = '';
  let lastIntro = '', lastEnd = '', lastReview = '', canvas, ctx, particles = [], raf = 0;
  let sequence = 87654321;
  // A private generator avoids consuming the game's random number stream.
  const rand = () => ((sequence = (1664525 * sequence + 1013904223) >>> 0) / 4294967296);
  const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
  const text = el => (el?.textContent || '').trim();
  function visible(el) {
    if (!el || !el.isConnected || el.closest('[hidden],.hide,.hidden')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }
  function permitted() {
    if (media.matches) return false;
    try { return JSON.parse(localStorage.getItem('jaras_global_settings') || '{}').motion !== false; }
    catch (_) { return true; }
  }
  function clearEffects() {
    ownAnimations.forEach(a => { try { a.cancel(); } catch (_) {} });
    ownAnimations.clear();
    particles = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (canvas) { canvas.remove(); canvas = null; ctx = null; }
  }
  function sync() {
    const next = permitted();
    if (enabled !== next || !root.hasAttribute('data-jaras-motion')) {
      enabled = next;
      root.setAttribute('data-jaras-motion', enabled ? 'on' : 'off');
      root.classList.toggle('jaras-reduced-motion', !enabled);
      document.body?.classList.toggle('neon-reduced-motion', !enabled);
      if (!enabled) clearEffects();
    }
    const hidden = document.hidden;
    if (root.getAttribute('data-jaras-motion-paused') !== String(hidden)) {
      root.setAttribute('data-jaras-motion-paused', String(hidden));
    }
    if (hidden) clearEffects();
  }
  function animate(el, frames, duration = 300, delay = 0, name = 'transition') {
    if (!enabled || document.hidden || !visible(el) || !el.animate) return;
    const old = activeByNode.get(el);
    if (old) { old.cancel(); ownAnimations.delete(old); }
    try {
      const a = el.animate(frames, {duration, delay, easing:'cubic-bezier(.2,.75,.25,1)', fill:'none'});
      ownAnimations.add(a); activeByNode.set(el, a);
      counters[name] = (counters[name] || 0) + 1;
      const cleanup = () => { ownAnimations.delete(a); if (activeByNode.get(el) === a) activeByNode.delete(el); };
      a.onfinish = cleanup; a.oncancel = cleanup;
    } catch (_) { /* Unsupported effects must never interrupt a game. */ }
  }
  function fade(el, delay = 0) { animate(el, [{opacity:.45},{opacity:1}], 260, delay, 'reveal'); }
  function pulse(el) {
    animate(el, [{transform:'scale(1)'},{transform:'scale(1.12)',offset:.38},{transform:'scale(1)'}], 330, 0, 'score');
  }
  function reveal(el, delay = 0) {
    animate(el, [{opacity:.55,transform:'perspective(700px) rotateX(-16deg)'},{opacity:1,transform:'perspective(700px) rotateX(0deg)'}], 320, delay, 'answer');
  }
  function shake(el) {
    animate(el, [{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(-2px)'},{transform:'translateX(0)'}], 230, 0, 'error');
  }
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas'); canvas.id = 'jaras-motion-canvas';
    canvas.setAttribute('aria-hidden','true'); canvas.tabIndex = -1;
    document.body.appendChild(canvas);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
    ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function burst(el, big = false) {
    if (!enabled || document.hidden || !visible(el)) return;
    ensureCanvas(); if (!ctx) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(35, Math.min(innerWidth - 35, rect.left + rect.width / 2));
    const y = Math.max(35, Math.min(innerHeight - 35, rect.top + rect.height / 2));
    const now = performance.now(), colors = ['#ffd270','#49deff','#ff78e4','#bfa4ff'];
    const count = big ? 30 : 12;
    for (let i=0;i<count;i++) {
      const angle = rand() * Math.PI * 2, speed = (big ? 170 : 70) + rand() * 100;
      particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-80,t:now,
        life:(big?1000:550)+rand()*300,size:2+rand()*3,color:colors[i%colors.length],rotation:rand()*6});
    }
    particles = particles.slice(-48);
    counters[big?'celebration':'sparkle'] = (counters[big?'celebration':'sparkle'] || 0)+1;
    if (!raf) raf = requestAnimationFrame(draw);
  }
  function draw(now) {
    raf=0;
    if (!enabled || document.hidden || !ctx) { clearEffects(); return; }
    ctx.clearRect(0,0,innerWidth,innerHeight);
    particles=particles.filter(p=>now-p.t<p.life);
    for(const p of particles) {
      const t=(now-p.t)/1000, progress=(now-p.t)/p.life;
      ctx.save();ctx.globalAlpha=Math.max(0,1-progress);
      ctx.translate(p.x+p.vx*t,p.y+p.vy*t+155*t*t);ctx.rotate(p.rotation+t*3);
      ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*1.5);ctx.restore();
    }
    if(particles.length) raf=requestAnimationFrame(draw);
    else {canvas.remove();canvas=null;ctx=null;}
  }
  const screens = '#home,#setup,#rules,#settings,#bank,#records,#game,#boardPanel,#boardScreen,#selection,#results,#finished,#finish,.neon-trivia #result';
  function onScreen(el) {
    if(el.id==='home') {
      if(document.body.classList.contains('neon-hub') && !document.body.classList.contains('playing')) {
        animate(q('.brand-logo'),[{transform:'rotate(-2deg) scale(.97)',opacity:.5},{transform:'rotate(1deg) scale(1.01)',opacity:1,offset:.65},{transform:'rotate(0) scale(1)',opacity:1}],650,0,'logo');
        all('.arcade-card').forEach((card,i)=>animate(card,[{opacity:.45,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],400,i*65,'card-entry'));
      } else {
        fade(q('.lobby-copy'));
        animate(q('.lobby-art'),[{opacity:.5,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}],430,0,'lobby');
      }
    } else if(['results','finished','finish','result'].includes(el.id)) {
      fade(el); burst(el.querySelector('.cup,.champ-name,h2,.winner') || el, true);
    } else fade(el);
  }
  function scan() {
    queued=false;sync();
    // Only decorative node animations are cancelled when a node is detached.
    ownAnimations.forEach(a=>{if(!a.effect?.target?.isConnected){a.cancel();ownAnimations.delete(a);}});
    all(screens).forEach(el=>{
      let v=visible(el);if(el.id==='home'&&document.body.classList.contains('playing'))v=false;
      if(v&&!pageState.get(el.id))onScreen(el);
      pageState.set(el.id,v);
    });
    const scoreNodes = all('#scoreboard strong,#scores strong,#teams .team .score,.team-score');
    const nowScores = scoreNodes.map(text);
    if(lastScores.length===nowScores.length)nowScores.forEach((s,i)=>{if(s!==lastScores[i]&&lastScores[i]!==undefined)pulse(scoreNodes[i]);});
    lastScores=nowScores;
    all('#answerSection,#answerArea,#goldAnswer,#tieAnswer').forEach(el=>{
      const signature=visible(el)?text(el):'';
      if(signature&&signature!==answerState.get(el.id))reveal(el);
      answerState.set(el.id,signature);
    });
    const question=text(q('#qtext,#questionText,#question'));
    if(question!==lastQuestion) {lastQuestion=question;answerState.delete('feud');}
    if(document.body.classList.contains('neon-feud')) {
      const open=all('.answer.open');
      const previous=answerState.get('feud')||[];
      const current=open.map(el=>el.getAttribute('onclick')+'|'+text(el));
      open.forEach((el,i)=>{if(!previous.includes(current[i]))reveal(el,i*35);});
      answerState.set('feud',current);
      const strikes=q('#strikes');const signature=text(strikes);
      if(signature!==lastStrikes&&lastStrikes)shake(strikes);lastStrikes=signature;
    }
    if(document.body.classList.contains('neon-vault')) {
      const end=q('#endPanel'),signature=visible(end)?text(q('#endTitle'))+'|'+text(q('#endText')):'';
      if(signature&&signature!==lastEnd){
        const icon=q('#endIcon');
        animate(icon,[{transform:'scale(.85) rotate(-7deg)',opacity:.5},{transform:'scale(1.08) rotate(2deg)',opacity:1,offset:.65},{transform:'scale(1) rotate(0)'}],530,0,'vault-open');
        if(icon?.classList.contains('celebrate'))burst(icon,true);
      }lastEnd=signature;
      const msg=q('#attemptMsg'),attempt=text(msg);
      if(attempt&&attempt!==lastAttempt)shake(msg);lastAttempt=attempt;
    }
    if(document.body.classList.contains('neon-mystery')) {
      const intro=q('#playArea .big-intro'),signature=visible(intro)?text(intro):'';
      if(signature&&signature!==lastIntro){
        const icon=intro.querySelector('.intro-icon');
        animate(icon,[{transform:'scale(.88) rotate(-9deg)'},{transform:'scale(1.08) rotate(5deg)',offset:.45},{transform:'scale(1) rotate(0)'}],520,0,'box-open');burst(icon);
      }lastIntro=signature;
      all('.match-tile').forEach((el,i)=>{
        const key=el.id||String(i),value=text(el),previous=faceState.get(key);
        if(previous!==undefined&&value!==previous){
          // Text is never delayed/hidden: the original 45-second challenge is unmodified.
          animate(el,[{transform:'scale(.98)',opacity:.82},{transform:'scale(1)',opacity:1}],160,0,'match-flip');
        }faceState.set(key,value);
      });
      if(!q('.match-tile'))faceState.clear();
      const review=q('.result-review,.review-panel,#reviewPanel');const sig=visible(review)?text(review):'';
      if(sig&&sig!==lastReview)fade(review);lastReview=sig;
    }
  }
  function enqueue() {if(!queued){queued=true;requestAnimationFrame(scan);}}
  function start(){
    sync();ready=true;scan();
    observer=new MutationObserver(records=>{
      if(records.some(r=>!(r.target instanceof Element&&r.target.closest('#jaras-motion-canvas'))))enqueue();
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','style']});
    document.addEventListener('pointerdown',e=>{
      const el=e.target instanceof Element?e.target.closest('button,[role="button"]'):null;
      if(!el||el.disabled||el.getAttribute('aria-disabled')==='true'||el.closest('#eyeTarget,.eye-image,.match-tile'))return;
      animate(el,[{transform:'scale(1)'},{transform:'scale(.98)',offset:.4},{transform:'scale(1)'}],150,0,'press');
    },{capture:true,passive:true});
    document.addEventListener('click',()=>queueMicrotask(enqueue),{passive:true});
    document.addEventListener('change',enqueue,{passive:true});
    addEventListener('storage',e=>{if(e.key==='jaras_global_settings'||e.key===null){sync();enqueue();}});
    addEventListener('resize',()=>{if(canvas){particles=[];if(raf)cancelAnimationFrame(raf);raf=0;canvas.remove();canvas=null;ctx=null;}},{passive:true});
    document.addEventListener('visibilitychange',sync);
    addEventListener('pagehide',clearEffects);
    if(media.addEventListener)media.addEventListener('change',sync);else media.addListener(sync);
  }
  // Read-only diagnostics; no game API or state exposed or replaced.
  window.JarasMotion=Object.freeze({version:'1.0',status:()=>({ready,enabled,active:ownAnimations.size,particles:particles.length,events:{...counters}})});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
