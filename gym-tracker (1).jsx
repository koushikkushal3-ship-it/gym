import { useState, useEffect, useRef, useCallback } from "react";

const START_DATE = new Date("2026-03-02");
const TOTAL_DAYS = 92;
const FREE_DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const storage = window.storage;
const storeLoad = async (key) => { try { const r = await storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; } };
const storeSave = async (key, val) => { try { await storage.set(key, JSON.stringify(val)); } catch {} };

const MUSCLE_MAP = {
  "Chest & Back":     ["chest","lats","middle back","lower back","traps"],
  "Legs & Glutes":    ["quadriceps","hamstrings","glutes","calves","adductors","abductors"],
  "Core Blast":       ["abdominals","obliques"],
  "Full Body":        ["chest","quadriceps","hamstrings","shoulders","lats","abdominals"],
  "Lower Body + Core":["quadriceps","hamstrings","glutes","abdominals","obliques"],
  "Back & Shoulders": ["lats","middle back","lower back","shoulders","traps"],
};
const FAT_AREA = {
  "Chest & Back":"Chest · Back",
  "Legs & Glutes":"Legs · Hips · Ass",
  "Core Blast":"Belly · Love Handles",
  "Full Body":"Full Body Burn",
  "Lower Body + Core":"Legs · Belly · Hips",
  "Back & Shoulders":"Back · Shoulders",
};

const SCHEDULE = {
  0:{name:"Chest & Back",icon:"🏋️",counts:[5,7,8]},
  1:{name:"Legs & Glutes",icon:"🦵",counts:[5,7,8]},
  2:{name:"Core Blast",icon:"🔥",counts:[5,7,7]},
  3:{name:"Full Body",icon:"💪",counts:[6,7,8]},
  4:{name:"Lower Body + Core",icon:"⚡",counts:[5,7,8]},
  5:{name:"Back & Shoulders",icon:"🦾",counts:[5,7,8]},
  6:{name:"REST",icon:"😴",counts:[0,0,0]},
};

const CARDIO_INFO = [
  {name:"Cardio",detail:"20–25 min steady pace · Walk or Bike"},
  {name:"Cardio",detail:"30 min moderate · Jog or Stairmaster"},
  {name:"HIIT Cardio",detail:"20 min high intensity · Intervals"},
];

const getPhase = (gymDay) => gymDay <= 15 ? 1 : gymDay <= 45 ? 2 : 3;

const generateDays = () => {
  const days = []; let gymDay = 0;
  for (let i=0;i<TOTAL_DAYS;i++) {
    const date = new Date(START_DATE); date.setDate(START_DATE.getDate()+i);
    const dow = date.getDay(); const isRest = dow===6;
    if (!isRest) gymDay++;
    const phase = getPhase(gymDay);
    const tmpl = SCHEDULE[dow];
    days.push({dayNum:i+1,date:date.toISOString().split("T")[0],dow,isRest,gymDay:isRest?null:gymDay,phase,tmpl});
  }
  return days;
};
const ALL_DAYS = generateDays();
const getToday = () => new Date().toISOString().split("T")[0];
const fmtDate = d => new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});

const PC = {1:"#22c55e",2:"#f59e0b",3:"#ef4444"};
const PL = {1:"BEGINNER",2:"INTERMEDIATE",3:"ADVANCED"};

const filterExercises = (db, workoutName, count, phase) => {
  const muscles = MUSCLE_MAP[workoutName]||[];
  const levelPref = phase===1?["beginner","intermediate"]:phase===2?["intermediate","beginner"]:["intermediate","expert"];
  let pool = db.filter(e=>e.primaryMuscles?.some(m=>muscles.includes(m.toLowerCase())));
  let sorted = [
    ...pool.filter(e=>e.level===levelPref[0]&&e.images?.length>0),
    ...pool.filter(e=>e.level===levelPref[1]&&e.images?.length>0&&e.level!==levelPref[0]),
    ...pool.filter(e=>e.images?.length>0&&!levelPref.includes(e.level)),
    ...pool.filter(e=>!e.images?.length),
  ];
  const sel=[]; const seen=new Set();
  for (const ex of sorted) { if(sel.length>=count)break; if(!seen.has(ex.name)){seen.add(ex.name);sel.push(ex);} }
  return sel;
};

// Colors
const BG="#050810",SURF="#0c0f1a",CARD="#111521",BORDER="#1a2133";
const CY="#06b6d4",GR="#22c55e",AM="#f59e0b",RD="#ef4444",PU="#a855f7";
const TX="#e2e8f0",MU="#64748b";

const css = {
  app:{minHeight:"100vh",background:BG,color:TX,fontFamily:"'Barlow Condensed',sans-serif",paddingBottom:"80px"},
  hdr:{background:"#070b18",borderBottom:`1px solid ${BORDER}`,padding:"14px 16px 0",position:"sticky",top:0,zIndex:200},
  logo:{fontSize:"26px",fontWeight:900,letterSpacing:"4px",background:`linear-gradient(90deg,${CY},${PU})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},
  sub:{fontSize:"10px",color:MU,letterSpacing:"2px",marginBottom:"10px",marginTop:"2px"},
  tabRow:{display:"flex",gap:"1px",overflowX:"auto",scrollbarWidth:"none"},
  tab:(a)=>({padding:"9px 13px",fontSize:"11px",fontWeight:700,letterSpacing:"1.5px",border:"none",background:a?`${CY}18`:"transparent",color:a?CY:MU,cursor:"pointer",borderRadius:"8px 8px 0 0",whiteSpace:"nowrap",borderBottom:a?`2px solid ${CY}`:"2px solid transparent",transition:"all .15s",fontFamily:"inherit"}),
  body:{padding:"14px",maxWidth:"720px",margin:"0 auto"},
  card:(c)=>({background:CARD,border:`1px solid ${c?c+"33":BORDER}`,borderRadius:"14px",padding:"14px",marginBottom:"12px",boxShadow:c?`0 0 18px ${c}0d`:"none"}),
  sec:{fontSize:"11px",fontWeight:700,letterSpacing:"2px",color:CY,marginBottom:"10px",textTransform:"uppercase"},
  g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"},
  g3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"},
  g4:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"8px"},
  stat:{background:SURF,border:`1px solid ${BORDER}`,borderRadius:"10px",padding:"12px 8px",textAlign:"center"},
  statV:(c)=>({fontSize:"20px",fontWeight:900,color:c||CY,lineHeight:1}),
  statL:{fontSize:"9px",color:MU,letterSpacing:"1px",marginTop:"3px"},
  bar:{height:"6px",background:"#1e2535",borderRadius:"3px",overflow:"hidden"},
  fill:(c,p)=>({height:"100%",width:`${Math.min(100,Math.max(0,p))}%`,background:`linear-gradient(90deg,${c}88,${c})`,borderRadius:"3px",transition:"width .5s",boxShadow:`0 0 8px ${c}55`}),
  inp:{background:SURF,border:`1px solid ${BORDER}`,borderRadius:"8px",padding:"10px 12px",color:TX,fontSize:"14px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"},
  btn:(c,sm)=>({background:`linear-gradient(135deg,${c||CY}cc,${c||CY})`,border:"none",borderRadius:"8px",padding:sm?"7px 14px":"10px 18px",color:BG,fontSize:sm?"12px":"13px",fontWeight:800,letterSpacing:"1px",cursor:"pointer",fontFamily:"inherit"}),
  ghost:(c)=>({background:`${c||CY}15`,border:`1px solid ${c||CY}33`,borderRadius:"7px",padding:"5px 12px",color:c||CY,fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:"1px"}),
  badge:(c)=>({padding:"2px 8px",background:`${c}18`,border:`1px solid ${c}44`,borderRadius:"4px",fontSize:"10px",color:c,fontWeight:700,letterSpacing:"1px",display:"inline-flex",alignItems:"center",gap:"3px"}),
  exCard:(done)=>({display:"flex",gap:"10px",padding:"10px",background:done?`${CY}09`:SURF,border:`1px solid ${done?CY+"33":BORDER}`,borderRadius:"10px",marginBottom:"8px",cursor:"pointer",transition:"all .15s",alignItems:"flex-start"}),
  cb:(done)=>({width:"24px",height:"24px",borderRadius:"7px",border:`2px solid ${done?CY:MU}`,background:done?CY:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"13px",fontWeight:900,color:BG,marginTop:"2px"}),
  thumb:{width:"60px",height:"60px",borderRadius:"8px",objectFit:"cover",flexShrink:0,background:BORDER},
  modal:{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  modalBox:{background:SURF,border:`1px solid ${BORDER}`,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"720px",maxHeight:"92vh",overflow:"auto",padding:"20px"},
};

// Body area rating component
function BodyRatingRow({area, idx}) {
  const key = `g:body_${idx}`;
  const [rating, setRating] = useState(null);
  useEffect(()=>{ storeLoad(key).then(v=>v!=null&&setRating(v)); },[]);
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
      <span style={{fontSize:"14px",fontWeight:600}}>{area}</span>
      <div style={{display:"flex",gap:"4px"}}>
        {[{e:"🔴",v:1},{e:"🟡",v:2},{e:"🟢",v:3}].map(r=>(
          <button key={r.v} style={{fontSize:"20px",background:"none",border:"none",cursor:"pointer",opacity:rating===r.v?1:.25,transition:"opacity .2s"}}
            onClick={()=>{setRating(r.v);storeSave(key,r.v);}}>{r.e}</button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("today");
  const [exerciseDB, setExerciseDB] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dayExs, setDayExs] = useState({});
  const [completed, setCompleted] = useState({});
  const [calories, setCalories] = useState({});
  const [overload, setOverload] = useState({});
  const [weights, setWeights] = useState([]);
  const [calTarget, setCalTarget] = useState(1800);
  const [selDate, setSelDate] = useState(getToday());
  const [modalEx, setModalEx] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchCat, setSearchCat] = useState("all");
  const [calInp, setCalInp] = useState({name:"",cal:""});
  const [olInps, setOlInps] = useState({});
  const [newWt, setNewWt] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [rapidKey, setRapidKey] = useState("");
  const [loaded, setLoaded] = useState(false);

  const todayStr = getToday();

  useEffect(()=>{
    (async()=>{
      const [ce,cal,ol,wt,ct,de,rk] = await Promise.all([
        storeLoad("g:completed"),storeLoad("g:calories"),storeLoad("g:overload"),
        storeLoad("g:weights"),storeLoad("g:calTarget"),storeLoad("g:dayExs"),storeLoad("g:rapidKey"),
      ]);
      if(ce)setCompleted(ce); if(cal)setCalories(cal); if(ol)setOverload(ol);
      if(wt)setWeights(wt); if(ct)setCalTarget(ct); if(de)setDayExs(de); if(rk)setRapidKey(rk);
      setLoaded(true);
    })();
  },[]);

  useEffect(()=>{
    fetch(FREE_DB_URL).then(r=>r.json()).then(data=>{setExerciseDB(data);setDbLoading(false);}).catch(()=>setDbLoading(false));
  },[]);

  useEffect(()=>{
    if(!exerciseDB||!loaded)return;
    const result={};
    ALL_DAYS.forEach(day=>{
      if(day.isRest)return;
      const count=day.tmpl.counts[day.phase-1];
      result[day.date]=filterExercises(exerciseDB,day.tmpl.name,count,day.phase);
    });
    setDayExs(result);
    storeSave("g:dayExs",result);
  },[exerciseDB,loaded]);

  const viewDay = ALL_DAYS.find(d=>d.date===selDate)||ALL_DAYS[0];
  const todayExs = dayExs[selDate]||[];
  const doneDates = completed[selDate]||[];
  const latestWt = weights.length?weights[weights.length-1].weight:92;
  const lostKg = +(92-latestWt).toFixed(1);
  const daysPassed = ALL_DAYS.filter(d=>d.date<=todayStr).length;
  const totalGymDays = ALL_DAYS.filter(d=>!d.isRest).length;
  const doneGym = ALL_DAYS.filter(d=>{
    if(d.isRest||d.date>todayStr)return false;
    const ex=dayExs[d.date]||[]; const dn=completed[d.date]||[];
    return ex.length>0&&dn.length>=ex.length;
  }).length;
  const calDay = calories[todayStr]||{items:[]};
  const consumed = (calDay.items||[]).reduce((s,i)=>s+i.cal,0);

  const navigate = dir => {
    const idx = ALL_DAYS.findIndex(d=>d.date===selDate);
    const next = ALL_DAYS[idx+dir]; if(next)setSelDate(next.date);
  };

  const toggleEx = async(date,idx)=>{
    const prev=completed[date]||[];
    const next=prev.includes(idx)?prev.filter(i=>i!==idx):[...prev,idx];
    const u={...completed,[date]:next}; setCompleted(u); await storeSave("g:completed",u);
  };

  const addCal = async()=>{
    if(!calInp.name||!calInp.cal)return;
    const prev=calories[todayStr]||{items:[]};
    const next={...prev,items:[...(prev.items||[]),{name:calInp.name,cal:+calInp.cal}]};
    const u={...calories,[todayStr]:next}; setCalories(u); setCalInp({name:"",cal:""}); await storeSave("g:calories",u);
  };
  const removeCal = async idx=>{
    const prev=calories[todayStr]||{items:[]};
    const items=(prev.items||[]).filter((_,i)=>i!==idx);
    const u={...calories,[todayStr]:{...prev,items}}; setCalories(u); await storeSave("g:calories",u);
  };
  const saveOl = async(date,exName,data)=>{
    const prev=overload[date]||{};
    const u={...overload,[date]:{...prev,[exName]:data}}; setOverload(u); await storeSave("g:overload",u);
  };
  const addWeight = async()=>{
    if(!newWt)return;
    const u=[...weights.filter(w=>w.date!==todayStr),{date:todayStr,weight:+newWt}].sort((a,b)=>a.date.localeCompare(b.date));
    setWeights(u); setNewWt(""); await storeSave("g:weights",u);
  };

  const searchResults = exerciseDB&&searchQ ? exerciseDB.filter(e=>{
    const q=searchQ.toLowerCase();
    const ok=e.name.toLowerCase().includes(q)||e.primaryMuscles?.some(m=>m.toLowerCase().includes(q))||e.category?.toLowerCase().includes(q);
    if(searchCat!=="all"){const ms=MUSCLE_MAP[searchCat]||[];if(!e.primaryMuscles?.some(m=>ms.includes(m.toLowerCase())))return false;}
    return ok;
  }).slice(0,40) : [];

  const tabs = [{id:"today",label:"TODAY",icon:"⚡"},{id:"library",label:"EXERCISES",icon:"📚"},{id:"calories",label:"CALORIES",icon:"🔥"},{id:"overload",label:"OVERLOAD",icon:"📈"},{id:"progress",label:"PROGRESS",icon:"🎯"},{id:"cal92",label:"92 DAYS",icon:"📅"}];

  if(!loaded) return <div style={{...css.app,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"10px"}}><div style={{fontSize:"48px",animation:"spin 1s linear infinite",display:"inline-block"}}>⚙️</div><div style={{color:CY,fontSize:"14px",letterSpacing:"4px",fontWeight:700}}>LOADING...</div></div>;

  return (
    <div style={css.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:${CY}33;border-radius:2px}
        input::placeholder{color:#2d3a50}
        button{transition:opacity .15s,transform .1s}button:active{transform:scale(.96)}
        .hov:hover{border-color:${CY}44!important;background:${CY}07!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes up{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        .tag{padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1px}
      `}</style>

      {/* HEADER */}
      <div style={css.hdr}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
          <div>
            <div style={css.logo}>💪 BEAST MODE 92</div>
            <div style={css.sub}>92KG → 80KG · HEIGHT 5.8 · START MAR 2, 2026</div>
          </div>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:900,fontSize:"16px",color:CY}}>{latestWt}kg</div>
              <div style={{fontSize:"9px",color:MU,letterSpacing:"1px"}}>CURRENT</div>
            </div>
            <button style={{background:`${MU}18`,border:`1px solid ${BORDER}`,borderRadius:"8px",padding:"6px 10px",cursor:"pointer",fontSize:"16px",color:TX}} onClick={()=>setShowSettings(s=>!s)}>⚙️</button>
          </div>
        </div>

        <div style={{display:"flex",gap:"6px",marginBottom:"8px",flexWrap:"wrap"}}>
          {[{l:"DAY",v:`${daysPassed}/92`,c:CY},{l:"SESSIONS",v:doneGym,c:GR},{l:"LOST",v:`${lostKg>=0?"-":""}${Math.abs(lostKg)}kg`,c:lostKg>0?GR:MU},{l:"CALORIES",v:`${consumed}/${calTarget}`,c:consumed>calTarget?RD:GR}].map(s=>(
            <div key={s.l} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:"8px",padding:"4px 10px",display:"flex",gap:"6px",alignItems:"center"}}>
              <span style={{fontSize:"9px",color:MU,letterSpacing:"1px"}}>{s.l}</span>
              <span style={{fontSize:"13px",fontWeight:800,color:s.c}}>{s.v}</span>
            </div>
          ))}
        </div>

        <div style={{...css.bar,marginBottom:"10px"}}><div style={css.fill(CY,daysPassed/TOTAL_DAYS*100)}/></div>
        <div style={css.tabRow}>{tabs.map(t=><button key={t.id} style={css.tab(tab===t.id)} onClick={()=>setTab(t.id)}>{t.icon} {t.label}</button>)}</div>
      </div>

      <div style={css.body}>

        {/* SETTINGS */}
        {showSettings&&(
          <div style={{...css.card(PU),animation:"up .2s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"12px"}}>
              <div style={css.sec}>⚙️ SETTINGS</div>
              <button style={css.ghost(MU)} onClick={()=>setShowSettings(false)}>✕ CLOSE</button>
            </div>
            <div style={{marginBottom:"12px"}}>
              <div style={{fontSize:"10px",color:MU,marginBottom:"6px",letterSpacing:"1px"}}>EXERCISEDB RAPIDAPI KEY — Unlock 11,000+ exercises with GIFs & videos</div>
              <div style={{display:"flex",gap:"8px"}}>
                <input style={css.inp} type="password" placeholder="Paste RapidAPI key here..." value={rapidKey} onChange={e=>setRapidKey(e.target.value)}/>
                <button style={css.btn(PU,true)} onClick={()=>storeSave("g:rapidKey",rapidKey)}>SAVE</button>
              </div>
              <div style={{fontSize:"10px",color:"#2d3a50",marginTop:"4px"}}>Get free key: rapidapi.com → search "ExerciseDB"</div>
            </div>
            <div>
              <div style={{fontSize:"10px",color:MU,marginBottom:"6px",letterSpacing:"1px"}}>DAILY CALORIE TARGET</div>
              <div style={{display:"flex",gap:"8px"}}>
                <input style={css.inp} type="number" value={calTarget} onChange={e=>setCalTarget(+e.target.value)}/>
                <button style={css.btn(CY,true)} onClick={()=>storeSave("g:calTarget",calTarget)}>SAVE</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TODAY ── */}
        {tab==="today"&&(
          <div style={{animation:"up .2s ease"}}>
            <div style={{display:"flex",gap:"8px",marginBottom:"12px",alignItems:"stretch"}}>
              <button style={css.ghost(CY)} onClick={()=>navigate(-1)}>◀</button>
              <div style={{flex:1,...css.card(),marginBottom:0,padding:"10px 14px",cursor:"pointer"}} onClick={()=>setSelDate(todayStr)}>
                <div style={{fontSize:"10px",color:MU,letterSpacing:"1px"}}>
                  DAY {viewDay.dayNum}/{TOTAL_DAYS} · {fmtDate(viewDay.date)}
                  {viewDay.date===todayStr&&<span style={{color:CY,marginLeft:"8px",fontWeight:700}}>◉ TODAY</span>}
                </div>
                <div style={{fontSize:"22px",fontWeight:900,marginTop:"2px",lineHeight:1.1}}>
                  {viewDay.tmpl.icon} {viewDay.tmpl.name}
                  {!viewDay.isRest&&<span style={{...css.badge(PC[viewDay.phase]),marginLeft:"8px",fontSize:"9px"}}>PHASE {viewDay.phase} · {PL[viewDay.phase]}</span>}
                </div>
                {!viewDay.isRest&&<div style={{fontSize:"11px",color:MU,marginTop:"3px"}}>🎯 {FAT_AREA[viewDay.tmpl.name]}</div>}
              </div>
              <button style={css.ghost(CY)} onClick={()=>navigate(1)}>▶</button>
            </div>

            {viewDay.isRest?(
              <div style={{background:`linear-gradient(135deg,#12003a,${SURF})`,border:`1px solid ${PU}22`,borderRadius:"16px",padding:"36px",textAlign:"center"}}>
                <div style={{fontSize:"64px",marginBottom:"10px"}}>😴</div>
                <div style={{fontSize:"32px",fontWeight:900,color:PU,letterSpacing:"4px"}}>REST DAY</div>
                <div style={{color:MU,marginTop:"8px",fontSize:"13px"}}>Recover · Hydrate · Eat clean · Sleep 8hrs</div>
                <div style={{marginTop:"16px",display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
                  {["💧 3L Water","🥗 Clean Eating","🧘 Stretch","😴 Sleep 8hrs"].map(t=>(
                    <span key={t} style={{...css.badge(PU),padding:"6px 12px",fontSize:"11px"}}>{t}</span>
                  ))}
                </div>
              </div>
            ):(
              <>
                {/* Progress bar */}
                {todayExs.length>0&&(
                  <div style={{...css.card(PC[viewDay.phase]),padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px",fontSize:"12px"}}>
                      <span style={{color:MU}}>Workout progress · {doneDates.length}/{todayExs.length+1}</span>
                      <span style={{color:PC[viewDay.phase],fontWeight:700}}>{Math.round(doneDates.length/(todayExs.length+1)*100)}%</span>
                    </div>
                    <div style={css.bar}><div style={css.fill(PC[viewDay.phase],doneDates.length/(todayExs.length+1)*100)}/></div>
                    {viewDay.phase===1&&<div style={{fontSize:"10px",color:GR,marginTop:"6px",letterSpacing:"1px"}}>⚡ MEDIUM INTENSITY — Building your foundation</div>}
                  </div>
                )}

                {dbLoading?(
                  <div style={{textAlign:"center",padding:"40px",color:MU}}>
                    <div style={{fontSize:"30px",animation:"spin 1s linear infinite",display:"inline-block"}}>⚙️</div>
                    <div style={{marginTop:"10px",fontSize:"12px",letterSpacing:"2px"}}>LOADING 800+ EXERCISES...</div>
                  </div>
                ):(
                  <>
                    <div style={css.sec}>EXERCISES — {viewDay.tmpl.name}</div>
                    {todayExs.map((ex,idx)=>{
                      const done=doneDates.includes(idx);
                      const img=ex.images?.[0]?`${IMG_BASE}${ex.images[0]}`:null;
                      const olSaved=(overload[selDate]||{})[ex.name]||{};
                      return (
                        <div key={idx} className="hov" style={css.exCard(done)} onClick={()=>toggleEx(selDate,idx)}>
                          <div style={css.cb(done)}>{done?"✓":""}</div>
                          {img&&<img src={img} alt={ex.name} style={{...css.thumb,opacity:done?.4:1}} onError={e=>{e.target.style.display="none"}}/>}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:800,fontSize:"15px",lineHeight:1.2,textDecoration:done?"line-through":"none",color:done?MU:TX}}>{ex.name}</div>
                            <div style={{display:"flex",gap:"5px",marginTop:"4px",flexWrap:"wrap"}}>
                              {ex.primaryMuscles?.slice(0,2).map(m=><span key={m} className="tag" style={{background:`${CY}15`,color:CY}}>{m}</span>)}
                              {ex.level&&<span className="tag" style={{background:`${PC[viewDay.phase]}15`,color:PC[viewDay.phase]}}>{ex.level}</span>}
                              {ex.equipment&&<span className="tag" style={{background:`${MU}15`,color:MU}}>{ex.equipment}</span>}
                            </div>
                            {olSaved.weight&&<div style={{fontSize:"11px",color:AM,marginTop:"4px",fontWeight:700}}>📊 Logged: {olSaved.weight}kg · {olSaved.sets}×{olSaved.reps}</div>}
                          </div>
                          <button style={{...css.ghost(PU),padding:"4px 8px",fontSize:"10px",flexShrink:0}} onClick={e=>{e.stopPropagation();setModalEx(ex);}}>INFO</button>
                        </div>
                      );
                    })}

                    {/* Cardio */}
                    {(()=>{
                      const cidx=todayExs.length; const cdone=doneDates.includes(cidx);
                      const ci=CARDIO_INFO[viewDay.phase-1];
                      return (
                        <div className="hov" style={{...css.exCard(cdone),background:cdone?`${RD}09`:SURF,borderColor:cdone?`${RD}33`:BORDER}} onClick={()=>toggleEx(selDate,cidx)}>
                          <div style={{...css.cb(cdone),borderColor:cdone?RD:MU,background:cdone?RD:"transparent"}}>{cdone?"✓":""}</div>
                          <div style={{width:"60px",height:"60px",borderRadius:"8px",background:`${RD}15`,border:`1px solid ${RD}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",flexShrink:0}}>🏃</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,fontSize:"15px",lineHeight:1.2,textDecoration:cdone?"line-through":"none",color:cdone?MU:TX}}>{ci.name}</div>
                            <div style={{fontSize:"12px",color:MU,marginTop:"4px"}}>{ci.detail}</div>
                            <div style={{marginTop:"4px"}}>
                              <span className="tag" style={{background:`${RD}15`,color:RD}}>FAT BURN</span>
                              <span className="tag" style={{marginLeft:"4px",background:`${AM}15`,color:AM}}>ESSENTIAL</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── LIBRARY ── */}
        {tab==="library"&&(
          <div style={{animation:"up .2s ease"}}>
            <div style={css.sec}>EXERCISE LIBRARY · 800+ FREE EXERCISES</div>
            <div style={{...css.card(),marginBottom:"12px"}}>
              <input style={css.inp} placeholder="🔍  Search: push-up, chest, dumbbell, beginner..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
              <div style={{display:"flex",gap:"6px",marginTop:"10px",flexWrap:"wrap"}}>
                {[{k:"all",l:"ALL"},{k:"Chest & Back",l:"CHEST/BACK"},{k:"Legs & Glutes",l:"LEGS"},{k:"Core Blast",l:"CORE"},{k:"Back & Shoulders",l:"SHOULDERS"}].map(f=>(
                  <button key={f.k} style={css.ghost(searchCat===f.k?CY:MU)} onClick={()=>setSearchCat(f.k)}>{f.l}</button>
                ))}
              </div>
            </div>
            {dbLoading&&<div style={{textAlign:"center",padding:"40px",color:MU}}>Loading exercise database...</div>}
            {!dbLoading&&!searchQ&&(
              <div style={{textAlign:"center",padding:"40px",color:MU}}>
                <div style={{fontSize:"48px",marginBottom:"12px"}}>🔍</div>
                <div style={{fontSize:"16px",fontWeight:700,color:TX,marginBottom:"6px"}}>Search the Exercise Library</div>
                <div style={{fontSize:"12px"}}>800+ exercises with images & step-by-step instructions</div>
                <div style={{marginTop:"12px",fontSize:"11px",color:"#2d3a50"}}>Try: "squat" · "chest" · "beginner" · "dumbbell"</div>
              </div>
            )}
            {!dbLoading&&searchQ&&searchResults.length===0&&(
              <div style={{textAlign:"center",padding:"30px",color:MU,fontSize:"14px"}}>No results for "{searchQ}"</div>
            )}
            {searchResults.map((ex,i)=>{
              const img=ex.images?.[0]?`${IMG_BASE}${ex.images[0]}`:null;
              return (
                <div key={i} className="hov" style={{...css.exCard(false),cursor:"pointer"}} onClick={()=>setModalEx(ex)}>
                  {img&&<img src={img} alt={ex.name} style={css.thumb} onError={e=>{e.target.style.display="none"}}/>}
                  {!img&&<div style={{...css.thumb,background:`${CY}11`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px"}}>💪</div>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:"15px",lineHeight:1.2}}>{ex.name}</div>
                    <div style={{display:"flex",gap:"5px",marginTop:"4px",flexWrap:"wrap"}}>
                      {ex.primaryMuscles?.slice(0,2).map(m=><span key={m} className="tag" style={{background:`${CY}15`,color:CY}}>{m}</span>)}
                      {ex.level&&<span className="tag" style={{background:`${AM}15`,color:AM}}>{ex.level}</span>}
                      {ex.equipment&&<span className="tag" style={{background:`${MU}15`,color:MU}}>{ex.equipment}</span>}
                      {ex.force&&<span className="tag" style={{background:`${PU}15`,color:PU}}>{ex.force}</span>}
                    </div>
                  </div>
                  <div style={{color:MU,fontSize:"20px",paddingLeft:"4px"}}>›</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CALORIES ── */}
        {tab==="calories"&&(
          <div style={{animation:"up .2s ease"}}>
            <div style={css.g3}>
              {[{l:"CONSUMED",v:consumed,c:consumed>calTarget?RD:CY},{l:"TARGET",v:calTarget,c:TX},{l:consumed>calTarget?"OVER":"LEFT",v:Math.abs(calTarget-consumed),c:consumed>calTarget?RD:GR}].map(s=>(
                <div key={s.l} style={css.stat}>
                  <div style={css.statV(s.c)}>{s.v}</div>
                  <div style={css.statL}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={css.card()}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px",fontSize:"12px"}}>
                <span style={{color:MU}}>Daily progress</span>
                <span style={{color:consumed>calTarget?RD:CY,fontWeight:700}}>{Math.min(Math.round(consumed/calTarget*100),999)}%</span>
              </div>
              <div style={css.bar}><div style={css.fill(consumed>calTarget?RD:GR,consumed/calTarget*100)}/></div>
              <div style={{fontSize:"10px",color:"#2d3a50",marginTop:"8px",letterSpacing:"1px"}}>💡 For 92kg → 80kg fat loss: 1,600–1,900 cal/day · 150g+ protein</div>
            </div>

            <div style={css.card()}>
              <div style={css.sec}>LOG FOOD</div>
              <div style={{display:"flex",gap:"8px",marginBottom:"8px"}}>
                <input style={{...css.inp,flex:2}} placeholder="Food name (Roti, Chicken, Dal...)" value={calInp.name}
                  onChange={e=>setCalInp(p=>({...p,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addCal()}/>
                <input style={{...css.inp,flex:"0 0 85px"}} placeholder="kcal" type="number" value={calInp.cal}
                  onChange={e=>setCalInp(p=>({...p,cal:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addCal()}/>
              </div>
              <button style={{...css.btn(GR),width:"100%"}} onClick={addCal}>+ ADD FOOD</button>
            </div>

            {(calDay.items||[]).length>0&&(
              <div style={css.card()}>
                <div style={css.sec}>TODAY'S LOG</div>
                {(calDay.items||[]).map((item,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${BORDER}`}}>
                    <span style={{fontSize:"14px",flex:1}}>{item.name}</span>
                    <span style={{color:CY,fontWeight:800,marginRight:"10px"}}>{item.cal} cal</span>
                    <button style={{...css.ghost(RD),padding:"3px 8px",fontSize:"10px"}} onClick={()=>removeCal(i)}>✕</button>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:"10px",fontWeight:900,fontSize:"16px"}}>
                  <span style={{color:MU}}>TOTAL</span>
                  <span style={{color:consumed>calTarget?RD:CY}}>{consumed} cal</span>
                </div>
              </div>
            )}

            <div style={css.card()}>
              <div style={css.sec}>MACRO TARGETS</div>
              {[{n:"Protein",v:"150–160g",d:"Chicken, eggs, paneer, fish, whey",c:CY},{n:"Carbs",v:"150–200g",d:"Rice, roti, oats, sweet potato",c:AM},{n:"Healthy Fats",v:"50–60g",d:"Nuts, ghee (small), olive oil",c:GR},{n:"Water",v:"3–4 L",d:"Essential for metabolism & recovery",c:PU}].map(m=>(
                <div key={m.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${BORDER}`}}>
                  <div><div style={{fontWeight:700,fontSize:"14px",color:m.c}}>{m.n}</div><div style={{fontSize:"11px",color:MU}}>{m.d}</div></div>
                  <span style={{...css.badge(m.c),padding:"4px 10px",fontSize:"12px"}}>{m.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── OVERLOAD ── */}
        {tab==="overload"&&(
          <div style={{animation:"up .2s ease"}}>
            <div style={css.sec}>📈 PROGRESSIVE OVERLOAD LOG</div>
            <div style={{...css.card(),padding:"10px 14px",marginBottom:"12px",fontSize:"12px",color:MU}}>
              Add 2.5kg or 1–2 extra reps every 1–2 weeks to force continuous muscle growth
            </div>
            <div style={{display:"flex",gap:"8px",marginBottom:"12px",alignItems:"center"}}>
              <button style={css.ghost(CY)} onClick={()=>navigate(-1)}>◀ PREV</button>
              <div style={{flex:1,textAlign:"center",fontSize:"12px",color:MU}}>Day {viewDay.dayNum} · {fmtDate(viewDay.date)} · {viewDay.tmpl.name}</div>
              <button style={css.ghost(CY)} onClick={()=>navigate(1)}>NEXT ▶</button>
            </div>
            {viewDay.isRest?(
              <div style={{textAlign:"center",padding:"40px",color:PU,fontWeight:900,fontSize:"22px",letterSpacing:"3px"}}>😴 REST DAY</div>
            ):todayExs.length===0?(
              <div style={{textAlign:"center",padding:"30px",color:MU}}>Loading exercises...</div>
            ):todayExs.map((ex,idx)=>{
              const saved=(overload[selDate]||{})[ex.name]||{};
              const k=`${selDate}_${ex.name}`;
              const inp=olInps[k]||{weight:saved.weight||"",reps:saved.reps||"10",sets:saved.sets||"3",notes:saved.notes||""};
              const si=(f,v)=>setOlInps(p=>({...p,[k]:{...inp,[f]:v}}));
              const prevDates=ALL_DAYS.filter(d=>!d.isRest&&d.date<selDate&&d.tmpl.name===viewDay.tmpl.name).map(d=>d.date).reverse();
              const prevLog=prevDates.map(d=>(overload[d]||{})[ex.name]).find(l=>l&&l.weight);
              return (
                <div key={idx} style={css.card(AM)}>
                  <div style={{fontWeight:800,fontSize:"16px",marginBottom:"4px"}}>{ex.name}</div>
                  {ex.primaryMuscles?.length>0&&<div style={{display:"flex",gap:"5px",marginBottom:"8px"}}>{ex.primaryMuscles.slice(0,3).map(m=><span key={m} className="tag" style={{background:`${CY}15`,color:CY}}>{m}</span>)}</div>}
                  {prevLog&&(
                    <div style={{background:`${AM}0f`,border:`1px solid ${AM}22`,borderRadius:"8px",padding:"8px 10px",marginBottom:"10px",fontSize:"12px"}}>
                      <span style={{color:AM,fontWeight:700}}>📊 Previous: </span>{prevLog.weight}kg · {prevLog.sets}×{prevLog.reps}
                      <span style={{color:GR,marginLeft:"8px",fontWeight:700}}>→ Target: {(+prevLog.weight+2.5).toFixed(1)}kg!</span>
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"8px"}}>
                    {[{f:"weight",l:"WEIGHT (kg)",p:"e.g. 20"},{f:"sets",l:"SETS",p:"4"},{f:"reps",l:"REPS",p:"12"}].map(field=>(
                      <div key={field.f}>
                        <div style={{fontSize:"9px",color:AM,marginBottom:"4px",letterSpacing:"1px"}}>{field.l}</div>
                        <input style={css.inp} type="text" placeholder={field.p} value={inp[field.f]} onChange={e=>si(field.f,e.target.value)}/>
                      </div>
                    ))}
                  </div>
                  <input style={{...css.inp,marginBottom:"8px"}} placeholder="Notes (optional — e.g. felt strong, increase next time)" value={inp.notes} onChange={e=>si("notes",e.target.value)}/>
                  <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                    <button style={css.btn(AM)} onClick={()=>saveOl(selDate,ex.name,inp)}>💾 SAVE LOG</button>
                    {saved.weight&&<span style={{fontSize:"12px",color:GR}}>✓ Saved: {saved.weight}kg</span>}
                    {ex.images?.[0]&&<button style={{...css.ghost(PU),padding:"4px 8px",marginLeft:"auto"}} onClick={()=>setModalEx(ex)}>📷 DEMO</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PROGRESS ── */}
        {tab==="progress"&&(
          <div style={{animation:"up .2s ease"}}>
            <div style={css.card(CY)}>
              <div style={css.sec}>⚖️ WEIGHT TRACKER</div>
              <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
                <input style={css.inp} type="number" step="0.1" placeholder="Today's weight in kg" value={newWt} onChange={e=>setNewWt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addWeight()}/>
                <button style={css.btn(CY)} onClick={addWeight}>LOG</button>
              </div>
              <div style={css.g4}>
                {[{l:"START",v:"92kg",c:MU},{l:"NOW",v:`${latestWt}kg`,c:CY},{l:"LOST",v:`${lostKg}kg`,c:lostKg>0?GR:MU},{l:"GOAL",v:"80kg",c:AM}].map(s=>(
                  <div key={s.l} style={css.stat}><div style={{...css.statV(s.c),fontSize:"16px"}}>{s.v}</div><div style={css.statL}>{s.l}</div></div>
                ))}
              </div>
              <div style={{marginTop:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",marginBottom:"6px"}}>
                  <span style={{color:MU}}>Goal: Lose 12kg (92 → 80)</span>
                  <span style={{color:GR,fontWeight:700}}>{Math.max(0,+(lostKg/12*100).toFixed(0))}% complete</span>
                </div>
                <div style={css.bar}><div style={css.fill(GR,lostKg/12*100)}/></div>
              </div>
            </div>

            <div style={css.g2}>
              {[{l:"CHALLENGE DAYS",val:daysPassed,tot:TOTAL_DAYS,c:CY},{l:"GYM SESSIONS",val:doneGym,tot:totalGymDays,c:AM}].map(s=>(
                <div key={s.l} style={css.card()}>
                  <div style={{fontSize:"9px",color:s.c,letterSpacing:"1px",marginBottom:"6px"}}>{s.l}</div>
                  <div style={{fontSize:"26px",fontWeight:900,color:s.c}}>{s.val}<span style={{fontSize:"14px",color:MU}}>/{s.tot}</span></div>
                  <div style={{...css.bar,marginTop:"8px"}}><div style={css.fill(s.c,s.val/s.tot*100)}/></div>
                </div>
              ))}
            </div>

            {weights.length>0&&(
              <div style={css.card()}>
                <div style={css.sec}>WEIGHT HISTORY</div>
                {[...weights].reverse().slice(0,15).map((w,i,arr)=>{
                  const prev=arr[i+1]; const diff=prev?+(prev.weight-w.weight).toFixed(1):null;
                  return (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${BORDER}`}}>
                      <span style={{fontSize:"13px",color:MU}}>{fmtDate(w.date)}</span>
                      <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                        {diff!==null&&<span style={{fontSize:"11px",fontWeight:700,color:diff>0?GR:diff<0?RD:MU}}>{diff>0?"-"+diff:diff<0?"+"+Math.abs(diff):"same"}kg</span>}
                        <span style={{color:CY,fontWeight:900,fontSize:"15px"}}>{w.weight}kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={css.card()}>
              <div style={css.sec}>RATE YOUR PROGRESS BY BODY AREA</div>
              {["Belly / Love Handles","Chest","Back","Hips & Ass","Legs","Overall"].map((area,i)=><BodyRatingRow key={area} area={area} idx={i}/>)}
              <div style={{fontSize:"10px",color:"#2d3a50",marginTop:"8px"}}>🔴 No change · 🟡 Getting better · 🟢 Visible results</div>
            </div>

            <div style={css.card()}>
              <div style={css.sec}>FAT LOSS TIPS FOR YOUR TARGET AREAS</div>
              {[{a:"Belly & Love Handles",t:"Core work + calorie deficit is key. Planks, cable crunches & HIIT burn visceral fat fastest. Sleep 8hrs — cortisol kills belly fat loss.",c:GR},{a:"Legs & Hips",t:"Squats + hip thrusts recompose legs. Stairmaster 25–30 min is gold for hip fat. Progressive overload on legs 2x/week.",c:CY},{a:"Chest",t:"Bench press + incline press tighten chest. Fat loss here follows your overall calorie deficit — you can't spot-reduce alone.",c:AM},{a:"Back",t:"Deadlifts + rows build back thickness & improve posture. Back fat reduces significantly when you're in deficit 8+ weeks.",c:PU},{a:"Ass (Glutes)",t:"Hip thrusts with progressive weight + cable kickbacks 3x/week will shape and lift. Build muscle here to look tight even at 80kg.",c:RD}].map(tip=>(
                <div key={tip.a} style={{padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
                  <div style={{fontWeight:800,fontSize:"14px",color:tip.c,marginBottom:"3px"}}>{tip.a}</div>
                  <div style={{fontSize:"12px",color:MU,lineHeight:1.6}}>{tip.t}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 92 DAYS CALENDAR ── */}
        {tab==="cal92"&&(
          <div style={{animation:"up .2s ease"}}>
            <div style={css.sec}>92-DAY CHALLENGE OVERVIEW</div>
            <div style={css.g3}>
              {[{l:"PHASE 1",d:"Days 1–15",s:"Medium Intensity",c:GR},{l:"PHASE 2",d:"Days 16–45",s:"Intermediate",c:AM},{l:"PHASE 3",d:"Days 46–92",s:"Advanced + HIIT",c:RD}].map(p=>(
                <div key={p.l} style={{background:`${p.c}12`,border:`1px solid ${p.c}22`,borderRadius:"10px",padding:"10px 8px",textAlign:"center"}}>
                  <div style={{fontSize:"11px",fontWeight:900,color:p.c,letterSpacing:"1px"}}>{p.l}</div>
                  <div style={{fontSize:"12px",fontWeight:700,color:TX,marginTop:"2px"}}>{p.d}</div>
                  <div style={{fontSize:"10px",color:MU,marginTop:"1px"}}>{p.s}</div>
                </div>
              ))}
            </div>
            {(()=>{
              const weeks=[]; for(let i=0;i<ALL_DAYS.length;i+=7) weeks.push(ALL_DAYS.slice(i,i+7));
              return weeks.map((week,wi)=>(
                <div key={wi} style={{marginBottom:"8px"}}>
                  <div style={{fontSize:"9px",color:MU,letterSpacing:"1px",marginBottom:"3px",paddingLeft:"2px"}}>WEEK {wi+1} · {fmtDate(week[0].date)}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"}}>
                    {week.map(day=>{
                      const exs=dayExs[day.date]||[]; const dn=completed[day.date]||[];
                      const complete=!day.isRest&&exs.length>0&&dn.length>=exs.length;
                      const partial=!day.isRest&&dn.length>0&&!complete;
                      const past=day.date<todayStr; const isT=day.date===todayStr;
                      const pc=PC[day.phase];
                      return (
                        <div key={day.date} style={{
                          background:complete?`${GR}18`:isT?`${CY}15`:day.isRest?`${PU}0a`:SURF,
                          border:`1px solid ${isT?CY:complete?GR+"44":past&&!day.isRest?RD+"22":BORDER}`,
                          borderRadius:"6px",padding:"5px 2px",textAlign:"center",cursor:"pointer",
                          boxShadow:isT?`0 0 12px ${CY}44`:"none",transition:"all .15s",
                        }} onClick={()=>{setSelDate(day.date);setTab("today");}}>
                          <div style={{fontSize:"8px",color:MU}}>{day.date.slice(8)}</div>
                          <div style={{fontSize:"12px",marginTop:"1px"}}>
                            {day.isRest?"😴":complete?"✅":partial?"◑":past&&!day.isRest?"✗":isT?"◉":"·"}
                          </div>
                          <div style={{fontSize:"7px",color:day.isRest?PU:pc,fontWeight:700,marginTop:"1px"}}>{day.isRest?"REST":day.gymDay?`G${day.gymDay}`:""}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
            <div style={{...css.card(),padding:"10px 14px",fontSize:"11px",color:MU,letterSpacing:"1px"}}>
              ✅ Complete · ◑ Partial · ✗ Missed · ◉ Today · 😴 Saturday Rest
            </div>
          </div>
        )}
      </div>

      {/* EXERCISE DETAIL MODAL */}
      {modalEx&&(
        <div style={css.modal} onClick={()=>setModalEx(null)}>
          <div style={css.modalBox} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px",gap:"10px"}}>
              <div style={{fontWeight:900,fontSize:"20px",flex:1,lineHeight:1.2}}>{modalEx.name}</div>
              <button style={css.ghost(MU)} onClick={()=>setModalEx(null)}>✕</button>
            </div>

            {modalEx.images?.length>0&&(
              <div style={{display:"flex",gap:"8px",marginBottom:"14px",overflowX:"auto"}}>
                {modalEx.images.slice(0,3).map((img,i)=>(
                  <img key={i} src={`${IMG_BASE}${img}`} alt={modalEx.name}
                    style={{height:"160px",width:"auto",borderRadius:"10px",flexShrink:0,objectFit:"cover",border:`1px solid ${BORDER}`}}
                    onError={e=>{e.target.style.display="none"}}/>
                ))}
              </div>
            )}

            <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"12px"}}>
              {modalEx.primaryMuscles?.map(m=><span key={m} className="tag" style={{background:`${CY}15`,color:CY}}>{m}</span>)}
              {modalEx.secondaryMuscles?.slice(0,3).map(m=><span key={m} className="tag" style={{background:`${MU}15`,color:MU}}>{m}</span>)}
              {modalEx.level&&<span className="tag" style={{background:`${AM}15`,color:AM}}>{modalEx.level}</span>}
              {modalEx.equipment&&<span className="tag" style={{background:`${GR}15`,color:GR}}>{modalEx.equipment}</span>}
              {modalEx.force&&<span className="tag" style={{background:`${PU}15`,color:PU}}>{modalEx.force}</span>}
              {modalEx.mechanic&&<span className="tag" style={{background:`${RD}15`,color:RD}}>{modalEx.mechanic}</span>}
            </div>

            {modalEx.instructions?.length>0&&(
              <div style={{marginBottom:"14px"}}>
                <div style={{...css.sec,marginBottom:"10px"}}>STEP-BY-STEP INSTRUCTIONS</div>
                {modalEx.instructions.map((inst,i)=>(
                  <div key={i} style={{display:"flex",gap:"10px",marginBottom:"10px",alignItems:"flex-start"}}>
                    <div style={{width:"24px",height:"24px",borderRadius:"50%",background:`${CY}18`,border:`1px solid ${CY}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:CY,flexShrink:0}}>{i+1}</div>
                    <div style={{fontSize:"13px",color:MU,lineHeight:1.6,flex:1}}>{inst}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{display:"flex",gap:"8px"}}>
              <button style={{...css.btn(CY),flex:1}} onClick={()=>{setModalEx(null);setTab("overload");}}>📈 LOG IN OVERLOAD</button>
              <button style={css.ghost(MU)} onClick={()=>setModalEx(null)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
