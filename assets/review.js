'use strict';
(() => {
  const modes=['review','visual','notes'];
  function select(article,mode,focus=false){
    if(!modes.includes(mode))return;
    article.querySelectorAll('.study-panel').forEach(panel=>{
      panel.hidden=panel.dataset.panel!==mode;
      if(panel.dataset.panel==='notes'&&!panel.hidden)panel.open=true;
    });
    article.querySelectorAll('.study-tabs [data-view]').forEach(button=>{
      const selected=button.dataset.view===mode;
      button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
      if(selected&&focus)button.focus({preventScroll:true});
    });
    article.dispatchEvent(new CustomEvent('studyviewchange',{bubbles:true}));
  }
  document.querySelectorAll('article:has(.study-tabs)').forEach(article=>{
    const tablist=article.querySelector('.study-tabs');
    tablist.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)select(article,b.dataset.view);});
    tablist.addEventListener('keydown',e=>{
      const button=e.target.closest('[data-view]');if(!button)return;
      const index=modes.indexOf(button.dataset.view);let next;
      if(e.key==='ArrowRight')next=(index+1)%modes.length;
      else if(e.key==='ArrowLeft')next=(index+modes.length-1)%modes.length;
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=modes.length-1;
      else return;
      e.preventDefault();select(article,modes[next],true);
    });
    article.addEventListener('requeststudyview',e=>{
      const panel=e.target.closest('.study-panel');if(panel)select(article,panel.dataset.panel);
    });
    select(article,'review');
  });
})();
