/* Optional Arabic announcer via platform speech synthesis; no game callbacks replaced. */
(()=>{'use strict';if(!('speechSynthesis'in window))return;
const synth=window.speechSynthesis;let last='',lastAt=0;const isMuted=()=>{
 try{const g=JSON.parse(localStorage.getItem('jaras_global_settings')||'{}');const a=JSON.parse(localStorage.getItem('jaras_audio_v52')||'{}');return g.sound===false||a.enabled===false||a.announcer===false||localStorage.getItem('jaras_sound_muted')==='1'}catch(_){return false}
};
function speak(text,key){if(isMuted()||document.hidden)return;const now=Date.now();if(last===key&&now-lastAt<7000)return;last=key;lastAt=now;
 try{if(synth.speaking)synth.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ar';u.rate=.96;u.pitch=1.04;u.volume=Math.min(1,Math.max(0,(JSON.parse(localStorage.getItem('jaras_audio_v52')||'{}').voiceVolume??75)/100));synth.speak(u)}catch(_){}
}
let prior='';function scan(){const candidates=[...document.querySelectorAll('#result,#results,#winner,#finalResult,#finishScreen,#gameOver')].filter(x=>x.offsetWidth&&x.offsetHeight&&!x.classList.contains('hide')&&!x.hidden);
 const result=candidates.map(x=>x.textContent||'').join(' ').trim();if(result&&result!==prior){prior=result;if(/تعادل/.test(result))speak('انتهت المنافسة بالتعادل!','tie');else if(/الفائز|الفريق الفائز|مبروك|تهانينا/.test(result))speak('تهانينا للفريق الفائز! يا لها من منافسة رائعة!','winner')}
}
let pending=false;function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;scan()},200)}
function ready(){new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});scan()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();