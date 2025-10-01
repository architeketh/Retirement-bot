// Mobile nav toggle (kept separate so your app.js stays untouched)
(function(){
  var btn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('topnav');
  if(!btn || !nav) return;
  btn.addEventListener('click', function(){
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.addEventListener('click', function(e){
    var a = (e.target.closest && e.target.closest('a')) || e.target;
    if (a && a.tagName === 'A'){
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
    }
  });
})();
