// Deterministic hook scheduler: effects run after each render and clean up on unmount.
function hookRenderer() {
  const slots = []; let cursor = 0; let dirty = false; let effects = [];
  const changed = (a,b) => !a || !b || a.length !== b.length || a.some((x,i)=>!Object.is(x,b[i]));
  const react = {
    useState(initial) { const i=cursor++; if (!slots[i]) slots[i]={value:typeof initial==='function'?initial():initial};
      return [slots[i].value, update=>{ const value=typeof update==='function'?update(slots[i].value):update;
        if (!Object.is(value,slots[i].value)) { slots[i].value=value; dirty=true; } }]; },
    useRef(value) { const i=cursor++; if (!slots[i]) slots[i]={current:value}; return slots[i]; },
    useEffect(effect,deps) { const i=cursor++; if (changed(slots[i]?.deps,deps)) effects.push(()=>{
      slots[i]?.cleanup?.(); slots[i]={deps,cleanup:effect()}; }); },
    useMemo(make,deps) { const i=cursor++; if (changed(slots[i]?.deps,deps)) slots[i]={deps,value:make()}; return slots[i].value; },
    useCallback(fn,deps) { return react.useMemo(()=>fn,deps); },
  };
  return { react, render(fn) { let result; let count=0; do { dirty=false;cursor=0;effects=[];result=fn();effects.forEach(f=>f());
    if (++count>20) throw Error('Render loop'); } while(dirty); return result; },
    cleanup() { slots.forEach(slot=>slot?.cleanup?.()); } };
}

module.exports = { hookRenderer };
