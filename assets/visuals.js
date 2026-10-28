'use strict';
(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = n => Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
  const table = (headers, rows, className='', marks=[]) => `<div class="viz-table-scroll"><table class="viz-table ${className}"><thead><tr>${headers.map(x=>`<th scope="col">${escape(x)}</th>`).join('')}</tr></thead><tbody>${rows.map((row,r)=>`<tr>${row.map((x,c)=>`<td class="${[x===null?'null-cell':'',marks[r]?.[c]||''].filter(Boolean).join(' ')}">${x===null?'NULL':escape(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const tabs = (labels, current, attr='choice') => `<div class="viz-tabs" role="group" aria-label="切换演示">${labels.map(([key,label])=>`<button type="button" data-${attr}="${key}" aria-pressed="${String(key)===String(current)}">${escape(label)}</button>`).join('')}</div>`;
  const result = text => `<p class="viz-explanation" role="status">${escape(text)}</p>`;
  const sql = text => `<pre class="viz-sql" aria-label="对应 SQL">${escape(text)}</pre>`;
  const bars = (rows, suffix='元', ceiling=null) => {
    const max=ceiling??Math.max(1,...rows.map(row=>row.value));
    return `<div class="viz-bars" role="img" aria-label="${escape(rows.map(x=>`${x.label} ${money(x.value)}${suffix}`).join('；'))}">${rows.map((row,i)=>`<div class="viz-bar-row"><span>${escape(row.label)}</span><div class="viz-bar-track"><i style="width:${row.value/max*100}%;--bar-color:${i%2?'var(--accent)':'var(--green)'}"></i></div><b>${money(row.value)}${suffix}</b></div>`).join('')}</div>`;
  };
  const orders=[
    {id:1,region:'东北',sex:'男',amount:120,month:'01月'},
    {id:2,region:'东北',sex:'女',amount:80,month:'01月'},
    {id:3,region:'华东',sex:'男',amount:180,month:'02月'},
    {id:4,region:'华东',sex:'女',amount:120,month:'02月'},
    {id:5,region:'东北',sex:'男',amount:100,month:'03月'},
    {id:6,region:'华东',sex:'女',amount:200,month:'03月'}
  ];
  const group = (rows,key,value) => {
    const map=new Map();rows.forEach(row=>map.set(row[key],(map.get(row[key])||0)+value(row)));
    return [...map].map(([label,value])=>({label,value}));
  };
  // Each demo is a local computation over labeled sample data; no database calls.
  function pivot(root) {
    let dimension='region',percent=false;
    function render(){const rows=group(orders,dimension,x=>x.amount),total=rows.reduce((sum,x)=>sum+x.value,0);
      root.innerHTML=`<div class="viz-controls"><label>分组维度 <select data-dimension><option value="region" ${dimension==='region'?'selected':''}>地区</option><option value="sex" ${dimension==='sex'?'selected':''}>性别</option></select></label>${tabs([['amount','金额'],['percent','占比']],percent?'percent':'amount')}</div>${bars(rows.map(x=>({...x,value:percent?x.value/total*100:x.value})),percent?'%':'元',percent?100:null)}${result(`合计 ${total} 元；${percent?'每组金额 ÷ 全部金额，所有组占比合计 100%。':'先按维度分组，再把每组的金额相加。'}`)}<details><summary>查看 6 条原始数据</summary>${table(['地区','性别','金额'],orders.map(x=>[x.region,x.sex,x.amount]))}</details>`;}
    root.addEventListener('change',e=>{if(e.target.matches('[data-dimension]')){dimension=e.target.value;render();root.querySelector('[data-dimension]').focus({preventScroll:true});}});
    root.addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(b){percent=b.dataset.choice==='percent';render();}});render();
  }
  function schema(root) {
    let selected='id';
    const fields={
      id:{label:'编号',type:'INT',rule:'PRIMARY KEY · AUTO_INCREMENT',sample:'1',reason:'唯一且非空，新增记录时可以自动生成。'},
      name:{label:'姓名',type:'VARCHAR(20)',rule:'NOT NULL',sample:'张三',reason:'保存文本，不允许 NULL；空字符串与 NULL 不同。'},
      phone:{label:'手机号',type:'VARCHAR(11)',rule:'UNIQUE',sample:'01380013800',reason:'用字符串保留前导零；唯一约束限制重复的非空号码。'},
      price:{label:'金额',type:'DECIMAL(10,2)',rule:'NOT NULL',sample:'128.50',reason:'共 10 位有效数字，其中 2 位小数，适合保存金额。'}
    };
    function render(){const f=fields[selected];root.innerHTML=`${tabs(Object.entries(fields).map(([key,f])=>[key,f.label]),selected)}<div class="schema-grid"><div class="schema-value"><span>${escape(f.label)}</span><strong>${escape(f.sample)}</strong><span>示例值</span></div><div class="schema-rules"><b>${escape(f.type)}</b><span>${escape(f.rule)}</span><p>${escape(f.reason)}</p></div></div>${sql(`${selected} ${f.type} ${f.rule.replace(' · ',' ')}`)}`;}
    root.addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(b){selected=b.dataset.choice;render();}});render();
  }
  function mutations(root) {
    let operation='update';
    const before=[{id:1,name:'张三',department:'开发部',salary:12000},{id:2,name:'李四',department:'测试部',salary:15000},{id:3,name:'王五',department:'开发部',salary:18000}];
    const queries={insert:"INSERT INTO emp_study (emp_id, emp_name, emp_dept, emp_salary)\nVALUES (4, '赵六', '测试部', 13000);",update:"UPDATE emp_study\nSET emp_salary = emp_salary + 1000\nWHERE emp_dept = '开发部';",delete:'DELETE FROM emp_study\nWHERE emp_salary = 15000;'};
    const cells = rows => rows.map(x=>[x.name,x.department,x.salary]);
    function render(){const after=operation==='insert'?[...before,{id:4,name:'赵六',department:'测试部',salary:13000}]:operation==='update'?before.map(x=>({...x,salary:x.salary+(x.department==='开发部'?1000:0)})):before.filter(x=>x.salary!==15000);
      root.innerHTML=`${tabs([['insert','INSERT 新增'],['update','UPDATE 修改'],['delete','DELETE 删除']],operation)}${sql(queries[operation])}<div class="viz-compare"><div><h3>执行前 · ${before.length} 人</h3>${table(['姓名','部门','工资'],cells(before),'',before.map(x=>[0,1,2].map(()=>operation==='delete'&&x.salary===15000?'removed-cell':'')))}</div><div class="viz-after"><h3>执行后 · ${after.length} 人</h3>${table(['姓名','部门','工资'],cells(after),'',after.map(x=>[0,1,2].map(i=>operation==='insert'&&x.id===4?'changed-cell':operation==='update'&&x.department==='开发部'&&i===2?'changed-cell':'')))}</div></div>${result(operation==='insert'?'新增赵六，其余记录不变。':operation==='update'?'只有开发部的张三、王五各增加 1000；李四不变。':'只有工资等于 15000 的李四被删除。')}`;
    }
    root.addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(b){operation=b.dataset.choice;render();}});render();
  }
  function query(root) {
    let step=0;
    const products=[['手机A','手机',1800,'自营'],['手机B','手机',2200,'自营'],['电脑A','电脑',4200,'自营'],['电脑B','电脑',3800,'自营'],['护肤品','美妆',2500,'自营'],['沙发','家居',3000,'非自营'],['手机C','手机',999,'非自营'],['台灯','家居',500,'自营']];
    const filtered=products.filter(x=>x[3]==='自营');const grouped=group(filtered.map(x=>({category:x[1],price:x[2]})),'category',x=>x.price).map(x=>[x.label,x.value/filtered.filter(y=>y[1]===x.label).length]);
    const having=grouped.filter(x=>x[1]>=2000),sorted=[...having].sort((a,b)=>b[1]-a[1]);
    const stages=[['FROM',products,'读取 8 条商品记录。'],['WHERE',filtered,'只留下 6 条自营商品。'],['GROUP BY',grouped,'按分类计算均价，得到 4 组。'],['HAVING',having,'保留均价 ≥ 2000 的 3 组。'],['ORDER BY',sorted,'按均价从高到低排列。'],['LIMIT',sorted.slice(0,2),'只取前 2 组：电脑、美妆。']];
    function render(){const stage=stages[step];root.innerHTML=`<div class="viz-steps" role="group" aria-label="查询步骤">${stages.map((x,i)=>`<button type="button" data-step="${i}" aria-pressed="${i===step}"><b>${i+1}</b><span>${x[0]}</span></button>`).join('')}</div><details class="viz-query-sql"><summary>查看对应 SQL</summary>${sql("SELECT category, AVG(price) AS avg_price\nFROM products\nWHERE is_self = '自营'\nGROUP BY category\nHAVING AVG(price) >= 2000\nORDER BY avg_price DESC\nLIMIT 2;")}</details>${result(stage[2])}${table(step<2?['商品','分类','价格','渠道']:['分类','平均价'],stage[1])}<div class="viz-step-nav"><button type="button" data-direction="-1" ${step===0?'disabled':''}>上一步</button><b>${step+1} / ${stages.length}</b><button type="button" data-direction="1" ${step===stages.length-1?'disabled':''}>下一步</button></div>`;}
    root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.step!==undefined)step=Number(b.dataset.step);else if(b.dataset.direction)step=Math.max(0,Math.min(stages.length-1,step+Number(b.dataset.direction)));else return;render();});render();
  }
  function joins(root) {
    let mode='left';
    const products=[{name:'手机',category:1},{name:'电脑',category:2},{name:'耳机',category:9}];
    const categories=[{id:1,name:'数码'},{id:2,name:'办公'},{id:3,name:'家居'}];
    const descriptions={inner:'INNER：只保留匹配成功的手机、电脑。',left:'LEFT：保留左表全部商品；耳机找不到分类，右侧补 NULL。',right:'RIGHT：保留右表全部分类；家居没有商品，左侧补 NULL。',full:'模拟全连接：商品和分类全部保留，两边未匹配的位置都补 NULL。'};
    function render(){const matched=products.flatMap(p=>categories.filter(c=>p.category===c.id).map(c=>[p.name,p.category,c.name]));const leftOnly=products.filter(p=>!categories.some(c=>p.category===c.id)).map(p=>[p.name,p.category,null]);const rightOnly=categories.filter(c=>!products.some(p=>p.category===c.id)).map(c=>[null,c.id,c.name]);const rows=[...matched,...(mode==='left'||mode==='full'?leftOnly:[]),...(mode==='right'||mode==='full'?rightOnly:[])];
      root.innerHTML=`${tabs([['inner','INNER'],['left','LEFT'],['right','RIGHT'],['full','全连接效果']],mode)}<div class="viz-compare join-inputs"><div><h3>左表：商品</h3>${table(['商品','分类ID'],products.map(p=>[p.name,p.category]))}</div><div><h3>右表：分类</h3>${table(['ID','分类'],categories.map(c=>[c.id,c.name]))}</div></div><div class="join-key">ON 商品.分类ID = 分类.ID</div><h3>连接结果 · ${rows.length} 行</h3>${table(['商品','分类ID','分类'],rows)}${result(descriptions[mode])}${mode==='full'?'<p>MySQL 需用 UNION 等方式模拟全连接，具体 SQL 见下方笔记。</p>':''}`;
    }
    root.addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(b){mode=b.dataset.choice;render();}});render();
  }
  // Round decimal input exactly (half away from zero), without binary float ties.
  function decimalRound(text){if(!/^-?\d{1,7}(\.\d{0,6})?$/.test(text))return null;const negative=text.startsWith('-'),[whole,frac='']=text.replace('-','').split('.');let cents=BigInt(whole)*100n+BigInt((frac+'00').slice(0,2));if(Number((frac+'000')[2])>=5)cents++;const digits=String(cents).padStart(3,'0');return `${negative&&cents!==0n?'-':''}${digits.slice(0,-2)}.${digits.slice(-2)}`;}
  function functions(root) {
    let mode='number';const values={number:'3.14159',text:'abcdef',date:'2026-10-28',score:'92'};
    function render(){const control=mode==='number'?'<label>数值 <input data-value="number" inputmode="decimal" value="'+escape(values.number)+'" maxlength="15"></label>':mode==='text'?'<label>字符串 <input data-value="text" value="'+escape(values.text)+'" maxlength="40"></label>':mode==='date'?'<label>日期 <input data-value="date" type="date" value="'+escape(values.date)+'"></label>':'<label>成绩 <input data-value="score" type="range" min="0" max="100" value="'+escape(values.score)+'"><output id="score-value">'+escape(values.score)+'</output></label>';
      root.innerHTML=`${tabs([['number','数值'],['text','文本'],['date','日期'],['score','条件判断']],mode)}<div class="function-controls">${control}</div><div class="function-result" aria-live="polite"></div>`;update();}
    function update(){let query,answer,reason;
      if(mode==='number'){answer=decimalRound(values.number);query=`ROUND(${values.number || '?'}, 2)`;reason=answer===null?'请输入最多 7 位整数、6 位小数的数字。':'保留 2 位小数；第 3 位决定是否进位。';answer??='—';}
      else if(mode==='text'){query=`SUBSTR('${values.text.replaceAll("'","''")}', 1, 3)`;answer=Array.from(values.text).slice(0,3).join('')||'空字符串';reason='从第 1 个字符开始，取 3 个字符。';}
      else if(mode==='date'){query=`DATE_SUB('${values.date}', INTERVAL 1 DAY)`;const date=new Date(values.date+'T00:00:00Z');if(Number.isNaN(date.getTime()))answer='请选择日期';else {date.setUTCDate(date.getUTCDate()-1);answer=date.toISOString().slice(0,10);}reason='日期减 1 天，自动跨月、跨年。';}
      else{const score=Number(values.score);root.querySelector('#score-value').textContent=score;query=`CASE WHEN ${score} >= 95 THEN 'A'\n     WHEN ${score} >= 90 THEN 'B'\n     ELSE 'C' END`;answer=score>=95?'A':score>=90?'B':'C';reason='按顺序判断：≥95 是 A，90–94 是 B，其余是 C。';}
      root.querySelector('.function-result').innerHTML=`<div class="function-flow"><div><span>输入与规则</span>${sql(query)}</div><span class="function-arrow" aria-hidden="true">→</span><div class="function-answer"><span>结果</span><strong>${escape(answer)}</strong></div></div>${result(reason)}`;
    }
    root.addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(b){mode=b.dataset.choice;render();}});root.addEventListener('input',e=>{const key=e.target.dataset.value;if(key){values[key]=e.target.value;update();}});render();
  }
  function dashboard(root) {
    let region='全部',metric='amount';
    function render(){const rows=orders.filter(x=>region==='全部'||x.region===region),total=rows.reduce((s,x)=>s+x.amount,0);const months=['01月','02月','03月'].map(label=>({label,value:rows.filter(x=>x.month===label).reduce((sum,x)=>sum+(metric==='amount'?x.amount:1),0)}));
      root.innerHTML=`<div class="viz-controls">${tabs([['全部','全部地区'],['东北','东北'],['华东','华东']],region,'region')}${tabs([['amount','金额'],['count','订单数']],metric,'metric')}</div><div class="viz-kpis"><div><span>销售额</span><strong>${money(total)}<small>元</small></strong></div><div><span>订单数</span><strong>${rows.length}<small>单</small></strong></div><div><span>平均订单金额</span><strong>${money(total/rows.length)}<small>元</small></strong></div></div><h3>${escape(region)} · 月度${metric==='amount'?'金额':'订单数'}</h3>${bars(months,metric==='amount'?'元':'单')}${result(`当前筛选：${region}。指标卡与图表一起更新，统计范围保持一致。`)}`;
    }
    root.addEventListener('click',e=>{const r=e.target.closest('[data-region]'),m=e.target.closest('[data-metric]');if(r)region=r.dataset.region;else if(m)metric=m.dataset.metric;else return;render();});render();
  }
  function warehouse(root) {
    let stage=0;
    const raw=[...orders,{...orders[0]},{id:7,region:'华东',sex:'男',amount:null,month:'03月'}];
    const seen=new Set();const clean=raw.filter(x=>{if(x.amount===null||seen.has(x.id))return false;seen.add(x.id);return true;});const aggregated=group(clean,'region',x=>x.amount);
    const descriptions=['8 条原始记录：包含 1 条重复订单和 1 条金额缺失记录。','按订单 ID 去重，剔除金额缺失示例，剩 6 条有效记录。','按地区汇总，得到 2 条报表数据：东北 300、华东 500。','同一份汇总结果交给图表展示，金额不再变化。'];
    function render(){root.innerHTML=`<div class="warehouse-path" role="group" aria-label="数据加工阶段">${[['ODS','原始数据',8],['DW','清洗明细',6],['ADS','汇总数据',2],['BI','图表展示',2]].map((x,i)=>`<button type="button" data-stage="${i}" aria-pressed="${i===stage}"><b>${x[0]}</b><span>${x[1]}</span><strong>${x[2]} ${i===3?'组':'条'}</strong></button>`).join('')}</div>${result(descriptions[stage])}${stage<2?table(['订单ID','地区','金额'],(stage===0?raw:clean).map(x=>[x.id,x.region,x.amount])):stage===2?table(['地区','汇总金额'],aggregated.map(x=>[x.label,x.value])):bars(aggregated)}<p>这是清洗规则示例；实际项目要先确认缺失数据和重复订单的业务处理方式。</p>`;}
    root.addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b){stage=Number(b.dataset.stage);render();}});render();
  }
  const demos=[pivot,schema,mutations,query,joins,functions,dashboard,warehouse];
  document.querySelectorAll('[data-demo]').forEach(section=>demos[Number(section.dataset.demo)-1](section.querySelector('.viz-mount')));
  // Delegated handlers above run first; restore focus after they replace controls.
  document.querySelectorAll('.viz-mount').forEach(mount=>mount.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button||button.isConnected)return;
    const attribute=[...button.attributes].find(a=>a.name.startsWith('data-'));
    if(!attribute)return;
    const replacement=mount.querySelector(`button[${attribute.name}="${CSS.escape(attribute.value)}"]`);
    if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});
    else mount.querySelector('button[aria-pressed="true"]')?.focus({preventScroll:true});
  }));
})();
