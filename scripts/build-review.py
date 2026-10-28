#!/usr/bin/env python3
"""Rebuild the expanded chapter blocks in index.html using only the standard library."""
from pathlib import Path
import html,json,re
ROOT=Path(__file__).resolve().parents[1]
source=json.loads((ROOT/'content/review-details.json').read_text())
page=(ROOT/'index.html').read_text()
esc=lambda value:html.escape(str(value))
def snippet(text):
    return '<pre class="review-sql" data-sql-dialect="mysql"><code>'+esc(text)+'</code></pre>'
def block(day,name,body):
    return f'<!-- expanded-{day}-{name}-start -->{body}<!-- expanded-{day}-{name}-end -->'
def replace_or_add(article,day,name,body,position):
    start=f'<!-- expanded-{day}-{name}-start -->';end=f'<!-- expanded-{day}-{name}-end -->'
    new=block(day,name,body)
    if start in article:
        return re.sub(re.escape(start)+'.*?'+re.escape(end),lambda _:new,article,flags=re.S)
    if position=='facts':
        pattern=r'(<div class="review-facts">.*?</span></div></div>)'
        result,n=re.subn(pattern,lambda m:m[0]+new,article,count=1,flags=re.S)
        if n!=1:raise RuntimeError(f'Missing review facts: {day}')
        return result
    needle=f'<h2 id="review-{day}-pitfall">'
    if needle not in article:raise RuntimeError(f'Missing pitfalls: {day}')
    return article.replace(needle,new+needle,1)
def build(match):
    article=match[0];key=re.search(r'data-key="([^"]+)"',article)[1]
    if not key.startswith('day-'):return article
    day=int(key[-2:]);item=source[str(day)]
    jumps=[(f'expanded-{day}-knowledge','知识全览'),(f'expanded-{day}-syntax','语法模板'),(f'review-{day}-example','讲解例题'),(f'expanded-{day}-practice','15 项项目 SQL' if day==8 else '典型题'),(f'review-{day}-pitfall','易错对照')]
    navigation='<nav class="review-jumps" aria-label="本章复习导航">'+''.join(f'<a href="#{target}" data-review-jump>{esc(label)}</a>' for target,label in jumps)+'</nav>'
    knowledge=navigation+f'<section class="chapter-knowledge"><h2 id="expanded-{day}-knowledge">知识点全览</h2>'+item['knowledge']+f'<h2 id="expanded-{day}-syntax">语法与操作模板</h2>'+item['syntax']+'</section>'
    article=replace_or_add(article,day,'knowledge',knowledge,'facts')
    title='电商项目：15 项需求与完整 SQL' if day==8 else '典型题：思路、写法与答案'
    practice=f'<section class="expanded-practice"><h2 id="expanded-{day}-practice">{title}</h2><div class="exercise-tools"><button type="button" data-exercise-toggle="open">展开本章例题</button><button type="button" data-exercise-toggle="close">收起本章例题</button></div>'
    for index,q in enumerate(item['questions'],1):
        practice+=f'<details class="worked-question" data-question="{day}-{index}"'+(' open' if index==1 else '')+'><summary>'+esc(q['title'])+'</summary><div class="worked-answer"><p><b>思路：</b>'+esc(q['method'])+'</p>'
        if q.get('sql'):practice+=snippet(q['sql'])
        practice+='<p class="worked-conclusion"><b>答案与检查：</b>'+esc(q['answer'])+'</p></div></details>'
    practice+='</section>'
    return replace_or_add(article,day,'practice',practice,'pitfall')
result=re.sub(r'<article\b.*?</article>',build,page,flags=re.S)
result=result.replace('>速记重点</button>','>完整复习</button>').replace('数据分析复习速记</h1>','数据分析复习手册</h1>')
result=result.replace('assets/style.css?v=7','assets/style.css?v=8').replace('assets/review.js?v=1','assets/review.js?v=2').replace('assets/app.js?v=7','assets/app.js?v=8')
(ROOT/'index.html').write_text(result)
print('Built 8 expanded review chapters and 36 worked cases.')
