'use strict';
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const articles = $$('article');
  const nav = $$('.nav-item');
  const labels = nav.map(el => el.children[1].textContent);
  const store = {get(key, fallback) {try {const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v);} catch {return fallback;}}, set(key, value) {try {localStorage.setItem(key, JSON.stringify(value));return true;} catch {return false;}}};
  const chapterKeys = articles.map(el => el.dataset.key);
  const learnable = articles.map((el,i) => el.querySelector('[data-complete]') ? i : null).filter(i => i !== null);
  const learningPath = learnable.filter(i => i !== 0);
  const legacyKeys = ['overview','day-01','day-02','day-03','day-04','corrections','practice','sources'];
  // Stable keys keep existing progress and shared chapter links valid as days are added.
  const priorCompletion = store.get('dh-completed', []);
  const savedCompleted = store.get('dh-completed-v2', null);
  const completionData = Array.isArray(savedCompleted) ? savedCompleted : (Array.isArray(priorCompletion) ? priorCompletion.map(i => Number.isInteger(i) ? legacyKeys[i] : null) : []);
  let completed = new Set(completionData.filter(key => learnable.some(i => chapterKeys[i] === key)));
  store.set('dh-completed-v2', [...completed]);
  const legacyChecklist = store.get('dh-checklist', {});
  let checklist = store.get('dh-checklist-v2', null);
  if (!checklist || typeof checklist !== 'object' || Array.isArray(checklist)) {
    checklist = {};
    if (legacyChecklist && typeof legacyChecklist === 'object') for (let i=0;i<4;i++) if (legacyChecklist[i]) checklist[`practice:${i}`] = true;
  }
  const isCompleted = i => completed.has(chapterKeys[i]);
  let current = 0, toastTimer, observer;
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  function toast(message) {$('#toast').textContent = message; $('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2300);}
  function updateProgress() {
    $('#completion-label').textContent = `${completed.size} / ${learnable.length}`;
    $('#completion-fill').style.width = `${completed.size / learnable.length * 100}%`;
    nav.forEach((el, i) => {$('.nav-status', el).innerHTML = isCompleted(i) ? icon('check') : (i > 0 && i <= 8 ? `0${i}` : '');el.setAttribute('aria-label', `${labels[i]}${isCompleted(i) ? '，已掌握' : ''}`);});
    $$('[data-complete]').forEach(button => {const done = isCompleted(Number(button.dataset.complete));button.classList.toggle('done', done);button.setAttribute('aria-pressed', String(done));$('span', button).textContent = done ? '已掌握' : '标记已掌握';});
    const next = learningPath.find(i => !isCompleted(i));
    $('#continue-reading').innerHTML = `${next === undefined ? '再复习一遍' : completed.size ? '继续学习' : '开始学习'} ${icon('arrow')}`;
  }
  function closeDrawer(restore = true) {document.body.classList.remove('drawer-open');$('#mobile-menu').setAttribute('aria-expanded', 'false');$('.sidebar').removeAttribute('aria-modal');$('.sidebar').removeAttribute('role');if (restore) $('#mobile-menu').focus();setSidebarState();}
  function setSidebarState() {const mobile = matchMedia('(max-width:760px)').matches;$('.sidebar').inert = mobile && !document.body.classList.contains('drawer-open');}
  function openDrawer() {document.body.classList.add('drawer-open');$('#mobile-menu').setAttribute('aria-expanded', 'true');$('.sidebar').setAttribute('role','dialog');$('.sidebar').setAttribute('aria-modal','true');setSidebarState();$('.sidebar .search-launch').focus();}
  function renderToc() {
    observer?.disconnect(); const container = $('#section-nav');container.replaceChildren();
    let headings = $$('h2[id]', articles[current]);
    if (!headings.length) headings = $$('details>summary', articles[current]).map((el,i) => {el.id ||= `source-heading-${i}`;return el;});
    headings.forEach(h => {const a = document.createElement('a');a.href = `#${h.id}`;a.textContent = h.textContent.replace(/^\d+\.\s*/, '');a.addEventListener('click', e => {e.preventDefault();for(let p=h.parentElement;p&&p!==articles[current];p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;h.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});h.setAttribute('tabindex','-1');h.focus({preventScroll:true});});container.append(a);});
    observer = new IntersectionObserver(entries => {const visible = entries.filter(e => e.isIntersecting);if (visible.length) {const id = visible[0].target.id;$$('a',container).forEach(a=>a.classList.toggle('active',a.hash===`#${id}`));}}, {rootMargin:'-90px 0px -60% 0px'});headings.forEach(h=>observer.observe(h));
    $('a', container)?.classList.add('active');
  }
  function show(n, focus = false, historyMode = 'push') {
    n = Math.max(0,Math.min(articles.length-1,Number.isFinite(n)?n:0));current = n;
    articles.forEach((el,i)=>{el.hidden = i!==n;el.classList.toggle('active',i===n);});
    nav.forEach((el,i)=>{el.classList.toggle('active',i===n);if(i===n)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    $('#crumb').textContent=labels[n];$('#count').textContent=`${String(n+1).padStart(2,'0')} / ${String(articles.length).padStart(2,'0')}`;
    $('#prev').disabled=n===0;$('#next').disabled=n===articles.length-1;$('#prev').setAttribute('aria-label',n>0?'上一章：'+labels[n-1]:'上一章');$('#next').setAttribute('aria-label',n<articles.length-1?'下一章：'+labels[n+1]:'下一章');
    $('#prev span').textContent=n>0?labels[n-1]:'上一章';$('#next span').textContent=n<articles.length-1?labels[n+1]:'下一章';
    document.title=`${labels[n]} · Dark Horse 学习日志`;
    const hash=`#${chapterKeys[n]}`;
    if (location.hash !== hash) {try {history[historyMode==='replace'?'replaceState':'pushState'](null,'',hash);}catch {}}
    store.set('dh-last-key', chapterKeys[n]);closeDrawer(false);renderToc();window.scrollTo({top:0,behavior:'instant'});updateReadingProgress();
    if(focus)$('h1',articles[n]).focus({preventScroll:true});
  }
  function updateReadingProgress() {const max = document.documentElement.scrollHeight-innerHeight;const fraction=max>0?Math.min(1,Math.max(0,scrollY/max)):1;const left=matchMedia('(max-width:760px)').matches?0:matchMedia('(max-width:1000px)').matches?228:252;$('#reading-line').style.width=`${fraction*(innerWidth-left)}px`;}
  nav.forEach((el,i)=>el.addEventListener('click',()=>show(i,true)));
  $$('[data-open]').forEach(el=>el.addEventListener('click',()=>show(Number(el.dataset.open),true)));
  $('#continue-reading').addEventListener('click',()=>show(learningPath.find(i=>!isCompleted(i))??1,true));
  $('#prev').addEventListener('click',()=>show(current-1,true));$('#next').addEventListener('click',()=>show(current+1,true));
  $$('[data-complete]').forEach(button=>button.addEventListener('click',()=>{const n=Number(button.dataset.complete),key=chapterKeys[n];if(completed.has(key))completed.delete(key);else completed.add(key);const saved=store.set('dh-completed-v2',[...completed]);updateProgress();toast(saved?(completed.has(key)?'已记录':'已取消掌握标记'):'本次已记录；浏览器无法保存进度');}));
  articles.forEach((article, chapter) => {
    $$('ul.checks li', article).forEach((li,i) => {
      const key = `${chapterKeys[chapter]}:${i}`;
      const label = document.createElement('label'); label.className = 'check-label';
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(checklist[key]);
      const span = document.createElement('span'); span.textContent = li.textContent;
      label.append(input,span); li.replaceChildren(label);
      input.addEventListener('change', () => {checklist[key] = input.checked; store.set('dh-checklist-v2',checklist);});
    });
  });
  function highlight(code) {const text=code.textContent;const pattern=/(--[^\n]*|'(?:''|[^'])*'|\b(?:LEFT JOIN|RIGHT JOIN|INNER JOIN|CROSS JOIN|UNION ALL|UNION|JOIN|WITH|ON|NULLIF|ROUND|CASE|WHEN|THEN|ELSE|END|IFNULL|COALESCE|IF|DATE_SUB|DATE_FORMAT|INTERVAL|YEAR|MONTH|QUARTER|COUNT|DISTINCT|SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|AS|AND|OR|IS NOT NULL|IS NULL|BETWEEN|IN|LIKE|DESC|ASC|AVG|SUM|COUNT|MIN|MAX|CREATE|TABLE|DATABASE|IF NOT EXISTS|NOT NULL|PRIMARY KEY|AUTO_INCREMENT|UNIQUE|DEFAULT|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|ALTER TABLE|ADD|CHANGE|DROP COLUMN|VARCHAR|INT|DECIMAL|USE|SHOW|DESC|CHARACTER SET)\b)/gi;const fragment=document.createDocumentFragment();let start=0;for(const m of text.matchAll(pattern)){fragment.append(document.createTextNode(text.slice(start,m.index)));const span=document.createElement('span');span.className=m[0].startsWith('--')?'sql-comment':m[0].startsWith("'")?'sql-string':'sql-keyword';span.textContent=m[0];fragment.append(span);start=m.index+m[0].length;}fragment.append(document.createTextNode(text.slice(start)));code.replaceChildren(fragment);}
  async function copyText(text) {if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return;}catch{}}const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const success=document.execCommand('copy');area.remove();if(!success)throw new Error('copy unavailable');}
  $$('pre:not(.source)').forEach(pre=>{const code=$('code',pre);if(!code)return;const raw=code.textContent;const wrapper=document.createElement('div');wrapper.className='code-block';const tools=document.createElement('div');tools.className='code-tools';const language=document.createElement('span');language.textContent=raw.includes('mysql -h')?'MYSQL / TERMINAL':'SQL';const button=document.createElement('button');button.type='button';button.className='copy-button';button.innerHTML=`${icon('copy')}<span>复制代码</span>`;button.setAttribute('aria-label','复制此段代码');button.addEventListener('click',async()=>{try{await copyText(raw);button.innerHTML=`${icon('check')}<span>已复制</span>`;toast('代码已复制');setTimeout(()=>button.innerHTML=`${icon('copy')}<span>复制代码</span>`,1800);}catch{toast('复制不可用，请选中代码手动复制');}});tools.append(language,button);pre.before(wrapper);wrapper.append(tools,pre);highlight(code);});
  const searchIndex=articles.map((article,i)=>({i,title:labels[i],text:article.textContent.replace(/\s+/g,' ').trim()}));
  const dialog=$('#search-dialog');let searchOpener;
  $$('.search-launch').forEach(button=>button.addEventListener('click',()=>{searchOpener=button;if(document.body.classList.contains('drawer-open'))closeDrawer(false);dialog.showModal();$('#search-input').focus();}));
  $('#close-search').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>{if(searchOpener&&!searchOpener.closest('[inert]'))searchOpener.focus();else if(matchMedia('(max-width:760px)').matches)$('#mobile-menu').focus();});
  function search(){const query=$('#search-input').value.trim().toLocaleLowerCase();const results=$('#search-results');results.replaceChildren();if(!query){$('#search-help').textContent='';return;}const matches=searchIndex.filter(x=>x.text.toLocaleLowerCase().includes(query)||x.title.toLocaleLowerCase().includes(query));$('#search-help').textContent=matches.length?`找到 ${matches.length} 个相关章节`:'没有找到，换个词试试，例如「分组」「金额」。';matches.forEach(item=>{const pos=item.text.toLocaleLowerCase().indexOf(query);const start=Math.max(0,pos-32);const excerpt=(start?'…':'')+item.text.slice(start,start+130)+'…';const button=document.createElement('button');button.className='search-result';button.type='button';button.setAttribute('role','listitem');const title=document.createElement('span');title.className='result-title';title.textContent=item.title;const snippet=document.createElement('span');snippet.className='result-snippet';const idx=excerpt.toLocaleLowerCase().indexOf(query);if(idx>=0){const mark=document.createElement('mark');mark.textContent=excerpt.slice(idx,idx+query.length);snippet.append(document.createTextNode(excerpt.slice(0,idx)),mark,document.createTextNode(excerpt.slice(idx+query.length)));}else snippet.textContent=excerpt;button.append(title,snippet);button.addEventListener('click',()=>{dialog.close();show(item.i,true);const candidates=$$('h2,p,li,td,pre,summary',articles[item.i]);const target=candidates.find(el=>el.textContent.toLocaleLowerCase().includes(query));if(target){for(let parent=target.parentElement;parent&&parent!==articles[item.i];parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;target.scrollIntoView({block:'center',behavior:'instant'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}});results.append(button);});}
  $('#search-input').addEventListener('input',search);
  $('#search-input').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();$('.search-result')?.focus();}if(e.key==='Enter')$('.search-result')?.click();});
  $('#theme-toggle').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';if(dark)document.documentElement.dataset.theme='dark';else delete document.documentElement.dataset.theme;try{localStorage.setItem('dh-theme',dark?'dark':'light');}catch{}updateTheme();});
  function updateTheme(){const dark=document.documentElement.dataset.theme==='dark';$('#theme-toggle').setAttribute('aria-pressed',String(dark));$('#theme-toggle').setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');$('meta[name="theme-color"]').content=dark?'#17221e':'#f7f8f4';}
  $('#mobile-menu').addEventListener('click',()=>document.body.classList.contains('drawer-open')?closeDrawer():openDrawer());$('#drawer-shade').addEventListener('click',()=>closeDrawer());
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!dialog.open)$('.search-launch').click();return;}if(dialog.open){if(e.key==='Escape'){e.preventDefault();dialog.close();}return;}if(e.key==='Escape'&&document.body.classList.contains('drawer-open')){closeDrawer();return;}if(e.key==='Tab'&&document.body.classList.contains('drawer-open')){const items=$$('a[href],button:not(:disabled)', $('.sidebar'));const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}if(e.target.closest('input,textarea,select,summary,button,a,[contenteditable]')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='ArrowRight'){e.preventDefault();show(current+1,true);}if(e.key==='ArrowLeft'){e.preventDefault();show(current-1,true);}});
  let printOpen=[];
  function preparePrint(){printOpen=$$('details').map(el=>el.open);$$('details').forEach(el=>el.open=true);articles.forEach(el=>el.hidden=false);}
  function finishPrint(){if(printOpen.length)$$('details').forEach((el,i)=>el.open=printOpen[i]);articles.forEach((el,i)=>el.hidden=i!==current);printOpen=[];updateReadingProgress();}
  $('#print-button').addEventListener('click',()=>window.print());window.addEventListener('beforeprint',preparePrint);window.addEventListener('afterprint',finishPrint);
  addEventListener('scroll',updateReadingProgress,{passive:true});addEventListener('resize',()=>{if(!matchMedia('(max-width:760px)').matches&&document.body.classList.contains('drawer-open'))closeDrawer(false);setSidebarState();updateReadingProgress();});
  function hashChapter(){
    const value = location.hash.slice(1);
    const direct = chapterKeys.indexOf(value);
    if(direct >= 0) return direct;
    const legacy = value.match(/^chapter-(\d+)$/);
    if(legacy) {const key = legacyKeys[Number(legacy[1])-1];const index = chapterKeys.indexOf(key);return index >= 0 ? index : null;}
    return null;
  }
  function resumedChapter(){
    const saved = store.get('dh-last-key',null);
    if(chapterKeys.includes(saved)) return chapterKeys.indexOf(saved);
    const old = store.get('dh-last-chapter',0);
    const key = Number.isInteger(old) ? legacyKeys[old] : 'overview';
    return Math.max(0,chapterKeys.indexOf(key));
  }
  addEventListener('popstate',()=>show(hashChapter()??0,false,'replace'));addEventListener('hashchange',()=>{const n=hashChapter();if(n!==null&&n!==current)show(n,true,'replace');});
  document.body.classList.add('js-ready');updateTheme();updateProgress();show(hashChapter()??resumedChapter(),false,'replace');setSidebarState();
  // Announce keyboard shortcut consistently with the visitor's platform.
  $('.sidebar .search-launch kbd').textContent=/Mac|iPhone|iPad/.test(navigator.platform)?'⌘ K':'Ctrl K';
})();
