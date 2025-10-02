/* Retirement Hub — mobile-ready SPA (Links, Lifestyle, Financial, Articles, Checklist)
   - Safe JSON loaders with fallbacks
   - “New this week” banner on Articles
   - Local checklist persistence + drag/drop
   - No dependency on news.json (Senior News is its own page)
*/

/* ---------- helpers ---------- */
function $(sel){ return document.querySelector(sel); }
function $id(id){ return document.getElementById(id); }
function fmtDate(d){
  try{ return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(d)); }
  catch(_){ return new Date(d).toLocaleString(); }
}
function setUpdated(ts){ var el=$id("lastUpdated"); if(el) el.textContent="Updated: "+fmtDate(ts); }
function warn(msg){
  var bar=$id("warnbar");
  if(!bar){
    bar=document.createElement("div");
    bar.id="warnbar";
    bar.style.cssText="position:sticky;top:0;z-index:5;background:#fff3cd;color:#664d03;border:1px solid #ffec99;padding:.5rem .75rem;border-radius:8px;margin:.5rem 0;";
    var host=document.querySelector("main")||document.body; host.insertBefore(bar,host.firstChild);
  }
  bar.textContent="⚠️ "+msg;
}
function getDomain(u){ try{ return new URL(u).hostname.replace(/^www\./,''); } catch(_){ return ""; } }

/* ---------- tabs/router ---------- */
document.addEventListener("click",function(e){
  var a=(e.target.closest?e.target.closest("a[data-tab]"):null);
  if(!a) return;
  var href=a.getAttribute("href")||"";
  if(href.indexOf("#")!==0) return;
  e.preventDefault(); setActiveTab(href.slice(1)||"links");
});
function setActiveTab(id){
  var secs=document.querySelectorAll(".tab");
  for(var i=0;i<secs.length;i++) secs[i].classList.toggle("active", secs[i].id===id);
  var tabs=document.querySelectorAll("a[data-tab]");
  for(var j=0;j<tabs.length;j++) tabs[j].classList.toggle("contrast", (tabs[j].getAttribute("href")==="#"+id) );
  try{ history.replaceState(null,"","#"+id); }catch(_){}
}
function router(){ var id=(location.hash||"#links").slice(1)||"links"; setActiveTab(id); }
window.addEventListener("hashchange",router);

/* ---------- defaults (used if JSON missing or empty) ---------- */
var DEFAULTS={
  links:[
    {"title":"Social Security (SSA)","url":"https://www.ssa.gov/","desc":"Official Social Security Administration site for retirement, disability, and survivors.","domain":"ssa.gov","category":"Official"},
    {"title":"Medicare.gov","url":"https://www.medicare.gov/","desc":"Coverage, costs, enrollment, and plan info.","domain":"medicare.gov","category":"Official"},
    {"title":"IRS","url":"https://www.irs.gov/","desc":"Tax forms, tools, and guidance.","domain":"irs.gov","category":"Taxes"},
    {"title":"USA.gov: Retirement","url":"https://www.usa.gov/retirement","desc":"Government retirement resources and help.","domain":"usa.gov","category":"Official"},
    {"title":"AARP Retirement","url":"https://www.aarp.org/retirement/","desc":"News, tools, and calculators.","domain":"aarp.org","category":"Guides"}
  ],
  articles:[
    {"title":"Medicare Basics: Parts A, B, C, and D","url":"https://www.medicare.gov/what-medicare-covers/your-medicare-coverage-choices","summary":"How the parts fit together and what they cover.","source":"Medicare.gov","published":"2025-09-20","tags":["medicare","coverage"]},
    {"title":"How to Plan a Roth Conversion","url":"https://www.nerdwallet.com/article/investing/roth-conversion","summary":"Pros, cons, and timing basics.","source":"NerdWallet","published":"2025-08-15","tags":["tax","roth","investing"]}
  ],
  checklist:[
    {"title":"Estimate Social Security benefit","note":"Try SSA estimator","due":"","done":false},
    {"title":"Review Medicare Part B & D options","note":"","due":"","done":false}
  ],
  lifestyle:[
    {
      "title":"Golf","desc":"Top courses, handicaps, rules, and more.","image":"",
      "tags":["golf"],
      "links":[
        {"label":"Golf Digest: America's 100 Greatest","url":"https://www.golfdigest.com/story/americas-100-greatest-golf-courses-ranking"},
        {"label":"GHIN Handicap (USGA)","url":"https://www.ghin.com/"},
        {"label":"USGA Handicapping","url":"https://www.usga.org/handicapping.html"}
      ]
    }
  ],
  financial:[
    {"title":"Investor.gov","url":"https://www.investor.gov/","desc":"SEC investor education.","category":"Financial","domain":"investor.gov"},
    {"title":"IRS Withholding Estimator","url":"https://www.irs.gov/individuals/tax-withholding-estimator","desc":"Estimate federal withholding.","category":"Calculators","domain":"irs.gov"},
    {"title":"SSA Retirement Estimator","url":"https://www.ssa.gov/benefits/retirement/estimator.html","desc":"Personalized SSA estimate.","category":"Calculators","domain":"ssa.gov"}
  ]
};

/* ---------- state ---------- */
var state={links:[],articles:[],checklist:[],lifestyle:[],financial:[],filters:{topics:{},lifestyle:{}}};

/* ---------- safe loader ---------- */
function loadJSON(path,fallback){
  // cache-bust to avoid stale JSON; no-store to bypass CDN caches
  return fetch(path+"?v=app9",{cache:"no-store"})
    .then(function(r){ if(!r.ok) throw new Error(path+" "+r.status); return r.json(); })
    .then(function(data){
      if (!data || (Array.isArray(data) && data.length===0)) {
        if (fallback) { warn(path+" is empty — using defaults."); return fallback; }
      }
      return data;
    })
    .catch(function(){ if(fallback) warn(path+" not found — using defaults."); return fallback; });
}

/* ---------- renderers ---------- */
function imageTag(src, alt){ return src ? '<img class="thumb" src="'+src+'" alt="'+(alt||"")+'" loading="lazy">' : ""; }

/* LINKS */
function linkCard(l){
  var imgSrc = l.image || (l.domain ? ("https://logo.clearbit.com/"+l.domain) : "");
  var img = imageTag(imgSrc, l.title||"");
  return '<article>'+img+
    '<h3><a href="'+(l.url||"#")+'" target="_blank" rel="noopener">'+(l.title||"")+'</a></h3>'+
    (l.desc?'<p class="muted">'+l.desc+'</p>':"")+
    '<small class="muted">'+(l.domain||"")+(l.category?(" • "+l.category):"")+'</small>'+
  '</article>';
}

/* ARTICLES */
function articleItem(a){
  var host = getDomain(a.url||"");
  var imgSrc = a.image || (host ? ("https://logo.clearbit.com/"+host) : "");
  var img = imageTag(imgSrc, a.source || host || a.title || "");
  var tags=(a.tags||[]).map(function(t){return'<small class="muted" style="margin-right:.5rem">#'+t+'</small>';}).join("");
  var date=a.published?'<small class="muted" style="margin-left:.25rem">('+fmtDate(a.published)+')</small>':"";
  return '<article>'+ img +
    '<h3><a href="'+(a.url||"#")+'" target="_blank" rel="noopener">'+(a.title||"")+'</a>'+date+'</h3>'+
    (a.summary?'<p>'+(a.summary||"")+'</p>':'')+
    (tags?('<div>'+tags+'</div>'):"")+
    '<small class="muted">'+(a.source||host||"")+'</small>'+
  '</article>';
}

/* LIFESTYLE */
function lifestyleCard(h){
  var catImg = imageTag(h.image, h.title||"");
  var tg=(h.tags||[]).map(function(t){return'<small class="muted" style="margin-right:.5rem">#'+t+'</small>';}).join("");
  var linkList=(h.links||[]).map(function(x){
    var label=x.label||x.url; var host=getDomain(x.url);
    var icon=host?'<img class="link-icon" src="https://logo.clearbit.com/'+host+'" alt="" loading="lazy" style="width:16px;height:16px;vertical-align:-3px;margin-right:4px">':'';
    return '<li>'+icon+' <a href="'+x.url+'" target="_blank" rel="noopener">'+label+'</a> <small class="muted">'+(host||x.url)+'</small></li>';
  }).join("");
  var adsList=(h.ads||[]).map(function(x){
    var label=x.label||x.url; var note=x.note?(' <small class="muted">('+x.note+')</small>'):""; var host=getDomain(x.url);
    var icon=host?'<img class="link-icon" src="https://logo.clearbit.com/'+host+'" alt="" loading="lazy" style="width:16px;height:16px;vertical-align:-3px;margin-right:4px">':'';
    return '<li>'+icon+' <a href="'+x.url+'" target="_blank" rel="noopener">'+label+'</a>'+note+'</li>';
  }).join("");
  var adsBlock=adsList?'<details class="ads"><summary>Sponsored</summary><ul class="plain-list">'+adsList+'</ul></details>':"";
  return '<article>'+catImg+
    '<h3>'+(h.title||"")+'</h3>'+
    (h.desc?('<p>'+(h.desc||"")+'</p>'):"")+
    (tg?('<div>'+tg+'</div>'):"")+
    (linkList?'<h4 class="muted" style="margin:.25rem 0 .25rem">Links</h4><ul class="plain-list" style="list-style:none;padding-left:0">'+linkList+'</ul>':'<p class="muted">No links yet.</p>')+
    adsBlock+
  '</article>';
}

/* FINANCIAL */
function financialCard(l){
  var imgSrc = l.image || (l.domain ? ("https://logo.clearbit.com/"+l.domain) : "");
  var img = imageTag(imgSrc, l.title||"");
  return '<article>'+img+
    '<h3><a href="'+(l.url||"#")+'" target="_blank" rel="noopener">'+(l.title||"")+'</a></h3>'+
    (l.desc?'<p>'+(l.desc||"")+'</p>':'')+
    '<small class="muted">'+(l.domain||"")+(l.category?(' • '+l.category):"")+'</small>'+
  '</article>';
}

/* ---------- render helpers ---------- */
function renderLinks(q){
  q=(q||"").toLowerCase();
  var list = state.links.filter(function(l){
    return (l.title+" "+(l.desc||"")+" "+(l.category||"")+" "+(l.domain||"")).toLowerCase().indexOf(q)!==-1;
  });
  $id("linksGrid").innerHTML=list.map(linkCard).join("");
}

function renderArticles(q){
  q=(q||($id("globalSearch")?$id("globalSearch").value:"")||"").toLowerCase();
  var active=state.filters.topics, list=state.articles.slice(0);
  var has=Object.keys(active).length>0;
  if(has){
    list=list.filter(function(a){
      var t=a.tags||[];
      for(var k in active){ if(t.indexOf(k)!==-1) return true; }
      return false;
    });
  }
  list=list.filter(function(a){
    return (a.title+" "+(a.summary||" ")+" "+(a.tags||[]).join(" ")).toLowerCase().indexOf(q)!==-1;
  });
  list.sort(function(a,b){ return (+new Date(b.published||0))-(+new Date(a.published||0)); });

  // NEW: count items from the last 7 days
  var weekAgo = Date.now() - 7*24*60*60*1000;
  var newCount = list.filter(function(a){
    var t = new Date(a.published||0).getTime();
    return isFinite(t) && t >= weekAgo;
  }).length;

  var banner = newCount>0
    ? '<div class="muted" style="margin:0 0 12px;font-weight:600;color:#2563eb">📌 '+newCount+' new article'+(newCount>1?'s':'')+' added this week</div>'
    : '';

  $id("articlesList").innerHTML = banner + (list.map(articleItem).join("") || "<p class='muted'>No matches yet.</p>");
}

function renderLifestyle(q){
  q=(q||($id("globalSearch")?$id("globalSearch").value:"")||"").toLowerCase();
  var active=state.filters.lifestyle, list=state.lifestyle.slice(0);
  var has=Object.keys(active).length>0;
  if(has){
    list=list.filter(function(h){
      var t=h.tags||[];
      for(var k in active){ if(t.indexOf(k)!==-1) return true; }
      return false;
    });
  }
  list=list.filter(function(h){
    return (h.title+" "+(h.desc||"")+" "+(h.tags||[]).join(" ")+" "+JSON.stringify(h.links||[])).toLowerCase().indexOf(q)!==-1;
  });
  $id("lifestyleList").innerHTML=list.map(lifestyleCard).join("");
}

function renderFinancial(q){
  q=(q||($id("globalSearch")?$id("globalSearch").value:"")||"").toLowerCase();
  var list = state.financial.filter(function(l){
    return (l.title+" "+(l.desc||"")+" "+(l.domain||"")+" "+(l.category||"")).toLowerCase().indexOf(q)!==-1;
  });
  $id("financialGrid").innerHTML=list.map(financialCard).join("");
}

function buildArticleFilters(){
  var all={}; state.articles.forEach(function(a){ (a.tags||[]).forEach(function(t){ all[t]=1; }); });
  var el=$id("articleFilters");
  el.innerHTML=Object.keys(all).sort().map(function(t){
    return '<button class="btn" data-article-tag="'+t+'">'+t+'</button>';
  }).join("");
  el.addEventListener("click",function(e){
    var x=e.target.closest?e.target.closest("button[data-article-tag]"):null; if(!x) return;
    var tag=x.getAttribute("data-article-tag");
    if(state.filters.topics[tag]) delete state.filters.topics[tag]; else state.filters.topics[tag]=1;
    x.classList.toggle("btn-primary");
    renderArticles();
  });
}

function buildLifestyleFilters(){
  var all={}; state.lifestyle.forEach(function(h){ (h.tags||[]).forEach(function(t){ all[t]=1; }); });
  var el=$id("lifestyleFilters");
  el.innerHTML=Object.keys(all).sort().map(function(t){
    return '<button class="btn" data-lifestyle-tag="'+t+'">'+t+'</button>';
  }).join("");
  el.addEventListener("click",function(e){
    var x=e.target.closest?e.target.closest("button[data-lifestyle-tag]"):null; if(!x) return;
    var tag=x.getAttribute("data-lifestyle-tag");
    if(state.filters.lifestyle[tag]) delete state.filters.lifestyle[tag]; else state.filters.lifestyle[tag]=1;
    x.classList.toggle("btn-primary");
    renderLifestyle();
  });
}

/* ---------- checklist ---------- */
function persistChecklist(){ try{ localStorage.setItem("retirement_hub_checklist",JSON.stringify(state.checklist)); }catch(_){ } }
function renderChecklist(){
  var wrap=$id("checklistContainer"); if(!wrap) return;
  if(!state.checklist.length){ wrap.innerHTML="<p class='muted'>No tasks yet.</p>"; return; }
  wrap.innerHTML=state.checklist.map(function(t,i){
    return '<div class="checklist-item '+(t.done?'completed':'')+'" draggable="true" data-idx="'+i+'">'+
      '<input type="checkbox" '+(t.done?'checked':'')+' data-action="toggle" data-idx="'+i+'">'+
      '<div><strong contenteditable data-action="edit" data-idx="'+i+'">'+(t.title||"")+'</strong>'+
        (t.note?'<div class="muted" contenteditable data-action="note" data-idx="'+i+'">'+t.note+'</div>':'<div class="muted" contenteditable data-action="note" data-idx="'+i+'" data-placeholder="Add note…"></div>')+
      '</div>'+
      '<input type="date" value="'+(t.due||"")+'" data-action="date" data-idx="'+i+'">'+
      '<div class="drag-handle" title="Drag to reorder">≡</div>'+
    '</div>';
  }).join("");

  [].forEach.call(wrap.querySelectorAll("[data-action='toggle']"),function(cb){
    cb.addEventListener("change",function(e){ var i=+e.target.getAttribute("data-idx"); state.checklist[i].done=e.target.checked; persistChecklist(); renderChecklist(); });
  });
  [].forEach.call(wrap.querySelectorAll("[data-action='edit']"),function(el){
    el.addEventListener("input",function(e){ var i=+e.target.getAttribute("data-idx"); state.checklist[i].title=e.target.textContent.trim(); persistChecklist(); });
  });
  [].forEach.call(wrap.querySelectorAll("[data-action='note']"),function(el){
    el.addEventListener("input",function(e){ var i=+e.target.getAttribute("data-idx"); state.checklist[i].note=e.target.textContent.trim(); persistChecklist(); });
  });
  [].forEach.call(wrap.querySelectorAll("[data-action='date']"),function(input){
    input.addEventListener("change",function(e){ var i=+e.target.getAttribute("data-idx"); state.checklist[i].due=e.target.value; persistChecklist(); });
  });

  // drag and drop
  [].forEach.call(wrap.querySelectorAll(".checklist-item"),function(row){
    row.addEventListener("dragstart",function(e){ e.dataTransfer.setData("text/plain", e.currentTarget.getAttribute("data-idx")); });
  });
  wrap.addEventListener("dragover",function(e){ e.preventDefault(); });
  wrap.addEventListener("drop",function(e){
    var from=+e.dataTransfer.getData("text/plain");
    var toEl=e.target.closest?e.target.closest(".checklist-item"):null; if(!toEl) return;
    var to=+toEl.getAttribute("data-idx");
    var item=state.checklist.splice(from,1)[0]; state.checklist.splice(to,0,item);
    persistChecklist(); renderChecklist();
  });
}
function addCustomTask(){ state.checklist.push({title:"New task",note:"",due:"",done:false}); persistChecklist(); renderChecklist(); }
function resetChecklist(){ try{ localStorage.removeItem("retirement_hub_checklist"); }catch(_){ } location.reload(); }

/* ---------- init ---------- */
function init(){
  setUpdated(new Date().toISOString());
  Promise.all([
    loadJSON("data/links.json",DEFAULTS.links),
    loadJSON("data/articles.json",DEFAULTS.articles),
    loadJSON("data/checklist.json",DEFAULTS.checklist),
    loadJSON("data/lifestyle.json",DEFAULTS.lifestyle),
    loadJSON("data/financial.json",DEFAULTS.financial)
  ]).then(function(d){
    state.links=d[0]||[];
    state.articles=d[1]||[];
    var saved=null; try{ saved=JSON.parse(localStorage.getItem("retirement_hub_checklist")||"null"); }catch(_){}
    state.checklist=saved||(d[2]||[]);
    state.lifestyle=d[3]||[];
    state.financial=d[4]||[];

    renderLinks(); renderArticles(); renderLifestyle(); renderFinancial(); renderChecklist();
    buildArticleFilters(); buildLifestyleFilters();

    var s=$id("globalSearch"); if(s) s.addEventListener("input",function(e){
      var q=e.target.value;
      renderLinks(q); renderArticles(q); renderLifestyle(q); renderFinancial(q);
    });

    $id("addTask")&&$id("addTask").addEventListener("click",addCustomTask);
    $id("printChecklist")&&$id("printChecklist").addEventListener("click",function(){ window.print(); });
    $id("resetChecklist")&&$id("resetChecklist").addEventListener("click",resetChecklist);

    router();
  });
}
init();