/* Jaras shared app update helper. Safe to load from the home page or individual games. */
(function () {
  'use strict';
  var BUILD = '4.8.1';
  var regPromise = null;
  function getRegistration() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    if (!regPromise) regPromise = navigator.serviceWorker.register('./service-worker.js').catch(function () { return null; });
    return regPromise;
  }
  function setStatus(message) {
    var el = document.getElementById('jarasUpdateStatus');
    if (el) el.textContent = message;
  }
  function showApply(show) {
    var el = document.getElementById('jarasApplyUpdate');
    if (el) el.hidden = !show;
  }
  function reloadWhenControlled() {
    if (!('serviceWorker' in navigator)) return;
    var wasControlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (wasControlled && sessionStorage.getItem('jaras_update_reload') === '1') {
        sessionStorage.removeItem('jaras_update_reload'); location.reload();
      }
      wasControlled = true;
    });
  }
  async function checkUpdate() {
    var button = document.getElementById('jarasUpdateButton');
    if (button) button.disabled = true;
    showApply(false);
    setStatus('جارٍ فحص تحديث التطبيق والملفات…');
    try {
      var versionResponse = await fetch('./version.json?check=' + Date.now(), { cache: 'no-store' });
      if (!versionResponse.ok) throw new Error('version unavailable');
      var remote = await versionResponse.json();
      var reg = await getRegistration();
      if (reg) {
        await reg.update().catch(function () {});
        if (reg.waiting) {
          setStatus('يتوفر تحديث للتطبيق. اضغط «تطبيق التحديث الآن».'); showApply(true);
        } else {
          var worker = reg.installing || reg.waiting;
          if (worker) {
            worker.addEventListener('statechange', function () {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                setStatus('تم تنزيل التحديث. اضغط «تطبيق التحديث الآن».'); showApply(true);
              }
            });
          }
          if (String(remote.version || BUILD) === BUILD) {
            setStatus('أنت على أحدث إصدار (' + BUILD + ').');
          } else {
            setStatus('نسخة أحدث متاحة: ' + String(remote.version) + '. اضغط لتطبيقها.'); showApply(true);
          }
        }
      } else {
        setStatus('تعذر تشغيل التحديث التلقائي في هذا المتصفح. حدّث الصفحة بعد نشر الملفات.');
      }
    } catch (_) {
      setStatus('تعذر الاتصال للتحقق من التحديث. تأكد من الإنترنت ثم أعد المحاولة.');
    } finally { if (button) button.disabled = false; }
  }
  async function applyUpdate() {
    var reg = await getRegistration();
    if (reg && reg.waiting) {
      sessionStorage.setItem('jaras_update_reload', '1');
      reg.waiting.postMessage('SKIP_WAITING');
      setStatus('يجري تطبيق التحديث…');
      setTimeout(function () { location.reload(); }, 1200);
      return;
    }
    setStatus('يجري تحديث الصفحة…');
    location.reload();
  }
  function init() {
    reloadWhenControlled();
    var button = document.getElementById('jarasUpdateButton');
    if (button) button.addEventListener('click', checkUpdate);
    var apply = document.getElementById('jarasApplyUpdate');
    if (apply) apply.addEventListener('click', applyUpdate);
    getRegistration();
    var v = document.getElementById('jarasCurrentVersion');
    if (v) v.textContent = 'الإصدار ' + BUILD;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
