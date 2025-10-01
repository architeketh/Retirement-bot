/* Retirement Hub – SPA loader (links, lifestyle, financial, articles) */

function $(s){return document.querySelector(s)}; function $id(id){return document.getElementById(id)};
function fmtDate(d){try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(d))}catch(_){return new Date(d).toLocaleString()}}
function setUpdated(ts){var el=$id("lastUpdated"); if(el) el.textContent="Updated: "+fmtDate(ts)}
function getDomain(u){try{return new URL(u).hostname.replace(/^www\./,'')}catch(_){return""}}

document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a[data-tab]"); if(!a) return; const h=a.getAttribute("href")||""; if(!h.startsWith("#")) return; e.preventDefault(); setActiveTab(h.slice(1)||"links")});
function setActiveTab(id){document.querySelectorAll(".tab").forEach(s=>s.classList.toggle("active",s.id===id)); document.querySelectorAll("a[data-tab]").forEach(t=>t.classList.toggle("contrast",t.getAttribute("href")==="#"+id)); try{history.replaceState(null,"","#"+id)}catch(_){}} 
function router(){const id=(location.hash||"#links").slice(1); setActiveTab(id||"links")} window.addEventListener("hashchange",router);

const DEFAULTS={
  links:[{"title":"Social Security (SSA)","url":"https://www.ssa.gov/","desc":"Benefits and retirement.","domain":"ssa.gov","category":"Official","image":"https://logo.clearbit.com/ssa.gov"},{"title":"Medicare","url":"https://www.medicare.gov/","desc":"Coverage & enrollment.","domain":"medicare.gov","category":"Official","image":"https://logo.clearbit.com/medicare.gov"},{"title":"IRS","url":"https://www.irs.gov/","desc":"Forms, calculators, withholding.","domain":"irs.gov","category":"Taxes","image":"https://logo.clearbit.com/irs.gov"},{"title":"USA.gov Retirement","url":"https://www.usa.gov/retirement","desc":"Government retirement resources.","domain":"usa.gov","category":"Official","image":"https://logo.clearbit.com/usa.gov"},{"title":"AARP Retirement","url":"https://www.aarp.org/retirement/","desc":"Tools and guides.","domain":"aarp.org","category":"Guides","image":"https://logo.clearbit.com/aarp.org"}],
  articles:[{"title":"How to Plan a Roth Conversion","url":"https://www.nerdwallet.com/article/investing/roth-conversion","summary":"Pros, cons, and timing basics.","source":"NerdWallet","published":"","tags":["tax","roth","investing"],"image":"https://logo.clearbit.com/nerdwallet.com"}],
  financial:[{"title":"Investor.gov","url":"https://www.investor.gov/","desc":"SEC investor education.","category":"Financial","domain":"investor.gov","image":"https://logo.clearbit.com/investor.gov"},{"title":"IRS Withholding Estimator","url":"https://www.irs.gov/individuals/tax-withholding-estimator","desc":"Estimate federal withholding.","category":"Calculators","domain":"irs.gov","image":"https://logo.clearbit.com/irs.gov"},{"title":"SSA Retirement Estimator","url":"https://www.ssa.gov/benefits/retirement/estimator.html","desc":"Personalized SSA estimate.","category":"Calculators","domain":"ssa.gov","image":"https://logo.clearbit.com/ssa.gov"}],
  checklist:[{"title":"Estimate Social Security benefit","note":"Check SSA estimator","due":"","done":false},{"title":"Review Medicare Part B & D options","note":"","due":"","done":false}]
};

var state={links:[],articles:[],lifestyle:[],financial:[],checklist:[],filters:{topics:{},lifestyle:{}}};

const BUST = "?v=base1";
function loadJSON(path,fallback){
  return fetch(path+BUST,{cache:"no-store"})
    .then(r=>{if(!r.ok) throw new Error(path+" "+r.status); return r.json()})
    .then(data=>{
      if (data==null) return (fallback??[]);
      if (Array.isArray(data)) return data.length?data:(fallback??[]);
      const arr = data.items || data.links || data.data || data.entries || [];
      return arr.length?arr:(fallback??[]);
    })
    .catch(_=> (fallback??[]));
}

function imageTag(src,alt){return src?`<img class="thumb" src="${src}" alt="${alt||""}" loading="lazy">`:""}

function linkCard(l){const imgSrc=l.image||(l.domain?`https://logo.clearbit.com/${l.domain}`:""); return `<article>${imageTag(imgSrc,l.title||"")}<h3><a href="${l.url||"#"}" target="_blank" rel="noopener">${l.title||""}</a></h3>${l.desc?`<p class="muted">${l.desc}</p>`:""}<small class="muted">${l.domain||""}${l.category?` • ${l.category}`:""}</small></article>`}
function articleItem(a){const host=(a.url&&new URL(a.url).hostname.replace(/^www\./,''))||""; const imgSrc=a.image||(host?`https://logo.clearbit.com/${host}`:""); const date=a.published?`<small class="muted" style="margin-left:.25rem">(${new Date(a.published).toLocaleDateString()})</small>`:""; const tags=(a.tags||[]).map(t=>`<small class="muted" style="margin-right:.5rem">#${t}</small>`).join(""); return `<article>${imageTag(imgSrc,a.source||host||a.title||"")}<h3><a href="${a.url||"#"}" target="_blank" rel="noopener">${a.title||""}</a>${date}</h3>${a.summary?`<p>${a.summary}</p>`:""}${tags?`<div>${tags}</div>`:""}<small class="muted">${a.source||host||""}</small></article>`}
function lifestyleCard(h){const tg=(h.tags||[]).map(t=>`<small class="muted" style="margin-right:.5rem">#${t}</small>`).join(""); const links=(h.links||[]).map(x=>{const host=(x.url&&new URL(x.url).hostname.replace(/^www\./,''))||""; const icon=host?`<img class="link-icon" src="https://logo.clearbit.com/${host}" alt="" loading="lazy">`:""; return `<li>${icon} <a href="${x.url}" target="_blank" rel="noopener">${x.label||x.url}</a> <small class="muted">${x.url}</small></li>`}).join(""); const ads=(h.ads||[]).map(x=>{const host=(x.url&&new URL(x.url).hostname.replace(/^www\./,''))||""; const icon=host?`<img class="link-icon" src="https://logo.clearbit.com/${host}" alt="" loading="lazy">`:""; return `<li>${icon} <a href="${x.url}" target="_blank" rel="noopener">${x.label||x.url}</a>${x.note?` <small class="muted">(${x.note})</small>`:""}</li>`}).join(""); return `<article>${imageTag(h.image,h.title||"")}<h3>${h.title||""}</h3>${h.desc?`<p>${h.desc}</p>`:""}${tg?`<div>${tg}</div>`:""}${links?`<h4 class="subtle">Links</h4><ul class="plain-list">${links}</ul>`:'<p class="muted">No links yet.</p>'}${ads?`<details class="ads"><summary>Sponsored</summary><ul class="plain-list">${ads}</ul></details>`:""}</article>`}
function financialCard(l){const imgSrc=l.image||(l.domain?`https://logo.clearbit.com/${l.domain}`:""); return `<article>${imageTag(imgSrc,l.title||"")}<h3><a href="${l.url||"#"}" target="_blank" rel="noopener">${l.title||""}</a></h3>${l.desc?`<p>${l.desc}</p>`:""}<small class="muted">${l.domain||""}${l.category?` • ${l.category}`:""}</small></article>`}

function renderLinks(q){const el=$id("linksGrid"); if(!el) return; q=(q||"").toLowerCase(); el.innerHTML=state.links.filter(l=>(`${l.title||""} ${l.desc||""} ${l.category||""} ${l.domain||""}`).toLowerCase().includes(q)).map(linkCard).join("")}
function renderArticles(q){const el=$id("articlesList"); if(!el) return; q=(q||($id("globalSearch")?$id("globalSearch").value:"")||"").toLowerCase(); let list=state.articles.slice(0); const active=state.filters.topics; if(Object.keys(active).length){list=list.filter(a=>{const t=a.tags||[]; for(const k in active){if(t.indexOf(k)!==-1) return true} return false})} list=list.filter(a=>(`${a.title||""} ${a.summary||" "} ${(a.tags||[]).join(" ")}`).toLowerCase().includes(q)); list.sort((a,b)=>(+new Date(b.published||0))-(+new Date(a.published||0))); el.innerHTML=list.map(articleItem).join("")||"<p class='muted'>No matches yet.</p>"}
function renderLifestyle(q){const el=$id("lifestyleList"); if(!el) return; q=(q||($id("globalSearch")?$id("globalSearch").value:"")||"").toLowerCase(); let list=state.lifestyle.slice(0); const active=state.filters.lifestyle; if(Object.keys(active).length){list=list.filter(h=>{const t=h.tags||[]; for(const k in active){if(t.indexOf(k)!==-1) return true} return false})} list=list.filter(h=>(`${h.title||""} ${h.desc||""} ${(h.tags||[]).join(" ")} ${JSON.stringify(h.links||[])}`).toLowerCase().includes(q)); el.innerHTML=list.map(lifestyleCard).join("")}
function renderFinancial(q){const el=$id("financialGrid"); if(!el) return; q=(q||($id("globalSearch")?$id("globalSearch").value:"")||"").toLowerCase(); el.innerHTML=state.financial.filter(l=>(`${l.title||""} ${l.desc||""} ${l.domain||""} ${l.category||""}`).toLowerCase().includes(q)).map(financialCard).join("")}

function buildArticleFilters(){const el=$id("articleFilters"); if(!el) return; const all={}; state.articles.forEach(a=>(a.tags||[]).forEach(t=>all[t]=1)); el.innerHTML=Object.keys(all).sort().map(t=>`<button class="secondary" data-article-tag="${t}">${t}</button>`).join(""); el.addEventListener("click",e=>{const x=e.target; if(!x||x.getAttribute("data-article-tag")==null) return; const tag=x.getAttribute("data-article-tag"); if(state.filters.topics[tag]) delete state.filters.topics[tag]; else state.filters.topics[tag]=1; x.classList.toggle("contrast"); renderArticles()})}
function buildLifestyleFilters(){const el=$id("lifestyleFilters"); if(!el) return; const all={}; state.lifestyle.forEach(h=>(h.tags||[]).forEach(t=>all[t]=1)); el.innerHTML=Object.keys(all).sort().map(t=>`<button class="secondary" data-lifestyle-tag="${t}">${t}</button>`).join(""); el.addEventListener("click",e=>{const x=e.target; if(!x||x.getAttribute("data-lifestyle-tag")==null) return; const tag=x.getAttribute("data-lifestyle-tag"); if(state.filters.lifestyle[tag]) delete state.filters.lifestyle[tag]; else state.filters.lifestyle[tag]=1; x.classList.toggle("contrast"); renderLifestyle()})}

function init(){
  setUpdated(new Date().toISOString());
  const hasChecklist = !!$id("checklistContainer");
  Promise.all([
    loadJSON("data/links.json", DEFAULTS.links),
    loadJSON("data/articles.json", DEFAULTS.articles),
    (hasChecklist ? loadJSON("data/checklist.json", DEFAULTS.checklist) : Promise.resolve([])),
    loadJSON("data/lifestyle.json", []),
    loadJSON("data/financial.json", DEFAULTS.financial)
  ]).then(d=>{
    state.links=d[0]||[]; state.articles=d[1]||[]; state.checklist=d[2]||[]; state.lifestyle=d[3]||[]; state.financial=d[4]||[];
    try{const saved=JSON.parse(localStorage.getItem("retirement_hub_checklist")||"null"); if(saved&&Array.isArray(saved)) state.checklist=saved}catch(_){}
    renderLinks(); renderArticles(); renderLifestyle(); renderFinancial();
    buildArticleFilters(); buildLifestyleFilters();
    const s=$id("globalSearch"); if(s) s.addEventListener("input",e=>{const q=e.target.value||""; renderLinks(q); renderArticles(q); renderLifestyle(q); renderFinancial(q)});
    router();
  }).catch(err=>{console.error(err)});
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
