import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Clock3, Dumbbell, Lock, LogOut, RotateCcw, Timer, Trophy } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const TOKEN_KEY = "our-gym-plan-token";
const PERSON_KEY = "gym-person";
const WEEK_KEY = "gym-week";

const PROGRAM = [
  { id: "A", name: "Upper Body 1", focus: "Chest · Back · Triceps", pairs: [
    [["DB bench press", "3 sets · 10 reps"], ["Lat pulldown", "3 sets · 10 reps"]],
    [["One-arm DB row", "3 sets · 10 each"], ["Rope triceps pressdown", "3 sets · 10 reps"]],
    [["Incline DB press", "3 sets · 10 reps"], ["Overhead DB triceps extension", "3 sets · 10 reps"]],
    [["Push-up", "Bonus · 3 sets"], ["Face pull", "Bonus · 3 sets"]]
  ]},
  { id: "B", name: "Lower Body", focus: "Quads · Hamstrings · Glutes", pairs: [
    [["Goblet squat", "3 sets · 10 reps"], ["DB Romanian deadlift", "3 sets · 10 reps"]],
    [["Leg press", "3 sets · 10 reps"], ["Seated hamstring curl", "3 sets · 10 reps"]],
    [["Standing calf raise", "3 sets · 12 reps"], ["Hip thrust machine", "3 sets · 10 reps"]],
    [["Reverse lunge", "Bonus · 3 sets"], ["Leg extension", "Bonus · 3 sets"]]
  ]},
  { id: "C", name: "Upper Body 2", focus: "Shoulders · Back · Biceps", pairs: [
    [["Seated DB shoulder press", "3 sets · 10 reps"], ["Chest-supported DB row", "3 sets · 10 reps"]],
    [["DB lateral raise", "3 sets · 12 reps"], ["Hammer curl", "3 sets · 10 reps"]],
    [["Face pull", "3 sets · 12 reps"], ["Alternating DB curl", "3 sets · 10 reps"]],
    [["Rear delt fly", "Bonus · 3 sets"], ["Incline DB curl", "Bonus · 3 sets"]]
  ]},
  { id: "D", name: "Full Body + Core", focus: "Strength · Stability · Core", pairs: [
    [["DB step-up", "3 sets · 10 each"], ["Incline push-up", "3 sets · 10 reps"]],
    [["DB deadlift", "3 sets · 10 reps"], ["Dead bug", "3 sets · 10 each"]],
    [["Pallof press", "3 sets · 10 each"], ["Front plank", "3 sets · 30 sec"]],
    [["Farmer carry", "Bonus · 3 rounds"], ["Cable wood chop", "Bonus · 3 sets"]]
  ]}
];

function api(action, body = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase settings haven't been added to GitHub yet.");
  return fetch(`${SUPABASE_URL}/functions/v1/gym-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ action, ...body })
  }).then(async response => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    return result;
  });
}

const emptyPayload = () => ({ sessions: [], weights: {}, week: 1, rotation: {} });
const todayKey = () => new Date().toLocaleDateString("en-CA");

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [person, setPerson] = useState(() => localStorage.getItem(PERSON_KEY) || "");
  const [pin, setPin] = useState("");
  const [payload, setPayload] = useState(emptyPayload);
  const [screen, setScreen] = useState("home");
  const [workoutId, setWorkoutId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(new Date());
  const [startedAt, setStartedAt] = useState(null);
  const [rest, setRest] = useState(0);
  const [expandedBonus, setExpandedBonus] = useState(false);

  const activeWorkout = PROGRAM.find(w => w.id === workoutId);
  const week = payload.week || 1;
  const completedThisWeek = useMemo(() => PROGRAM.filter(w => payload.sessions.some(s => s.workoutId === w.id && s.week === week && s.completedAt)).length, [payload, week]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setRest(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [rest > 0]);

  useEffect(() => {
    if (!token || !person) return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, person]);

  useEffect(() => {
    if (!startedAt || !activeWorkout) return;
    const eastern = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", hour: "numeric", minute: "2-digit", hour12: false }).format(now);
    const [h, m] = eastern.split(":").map(Number);
    const minuteOfDay = h * 60 + m;
    if (minuteOfDay === 6 * 60 + 45 && now.getSeconds() === 0) setNotice("5 minutes left. Finish your current set and start wrapping up.");
  }, [now, startedAt, activeWorkout]);

  async function loadProfile() {
    try {
      setBusy(true);
      const result = await api("load", { token });
      const profile = result.profiles?.find(p => p.profile === person);
      setPayload(profile?.payload && Object.keys(profile.payload).length ? profile.payload : emptyPayload());
      setError("");
    } catch (e) {
      setError(e.message);
      if (e.message.toLowerCase().includes("session expired")) logout();
    } finally { setBusy(false); }
  }

  async function save(next) {
    setPayload(next);
    try {
      await api("save", { token, profile: person, payload: next });
      setError("");
    } catch (e) { setError(e.message); }
  }

  async function login(e) {
    e.preventDefault();
    try {
      setBusy(true); setError("");
      const result = await api("login", { pin });
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token); setPin("");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setPayload(emptyPayload());
    setScreen("home");
    setStartedAt(null);
  }

  function choosePerson(name) {
    localStorage.setItem(PERSON_KEY, name);
    setPerson(name);
    setScreen("home");
  }

  function startWorkout(id) {
    setWorkoutId(id);
    setStartedAt(new Date().toISOString());
    setExpandedBonus(false);
    setNotice("");
    setScreen("workout");
  }

  function pairKey(id, pairIndex) { return `w${week}-${id}-p${pairIndex}`; }
  function exerciseKey(id, pairIndex, exerciseIndex) { return `${id}-p${pairIndex}-e${exerciseIndex}`; }

  function toggleExercise(pairIndex, exerciseIndex) {
    const key = exerciseKey(workoutId, pairIndex, exerciseIndex);
    const done = { ...(payload.done || {}) };
    done[key] = !done[key];
    save({ ...payload, done });
  }

  function togglePair(pairIndex) {
    const done = { ...(payload.done || {}) };
    const pair = activeWorkout.pairs[pairIndex];
    const complete = pair.every((_, exerciseIndex) => done[exerciseKey(workoutId, pairIndex, exerciseIndex)]);
    pair.forEach((_, exerciseIndex) => { done[exerciseKey(workoutId, pairIndex, exerciseIndex)] = !complete; });
    save({ ...payload, done });
  }

  function completeWorkout() {
    const sessions = [...(payload.sessions || []), {
      id: crypto.randomUUID(), workoutId, week, profile: person,
      startedAt: startedAt || new Date().toISOString(), completedAt: new Date().toISOString(),
      bonusDone: Boolean(payload.done?.[exerciseKey(workoutId, 3, 0)] || payload.done?.[exerciseKey(workoutId, 3, 1)]),
      exerciseSnapshot: activeWorkout.pairs.map((pair, pairIndex) => pair.map(([name, detail], exerciseIndex) => ({ name, detail, weight: payload.weights?.[name] || "", completed: Boolean(payload.done?.[exerciseKey(workoutId, pairIndex, exerciseIndex)]) })))
    }];
    save({ ...payload, sessions });
    setStartedAt(null);
    setScreen("home");
    setNotice("");
  }

  function nextWeek() {
    const nextWeek = week + 1;
    const supersetOrder = { ...(payload.supersetOrder || {}) };
    PROGRAM.forEach(workout => { supersetOrder['w' + nextWeek + '-' + workout.id] = [0, 1, 2].sort(() => Math.random() - .5); });
    save({ ...payload, week: nextWeek, supersetOrder, done: {} });
  }

  function updateWeight(name, value) {
    const weights = { ...(payload.weights || {}), [name]: value };
    save({ ...payload, weights });
  }

  const orderedWorkouts = PROGRAM;
  const easternTime = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", hour: "numeric", minute: "2-digit", hour12: true }).format(now);

  if (!token) return <main className="app-shell auth-shell">
    <Brand />
    <section className="welcome-panel">
      <div className="eyebrow">A LITTLE WORK GOES A LONG WAY</div>
      <h2>Good morning.</h2>
      <p>Enter your shared gym passcode to get started.</p>
      <form className="pin-form" onSubmit={login}>
        <label htmlFor="pin">Shared passcode</label>
        <input id="pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter passcode" required />
        <button className="primary-button" disabled={busy}>{busy ? "Checking…" : "Unlock the gym plan"}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="small-note"><Lock size={13} /> You'll stay signed in on this device for 30 days.</p>
    </section>
  </main>;

  if (!person) return <main className="app-shell auth-shell"><Brand /><section className="welcome-panel">
    <div className="eyebrow">WHO'S WORKING OUT?</div><h2>Choose your profile.</h2><p>We'll remember your choice on this device.</p>
    <div className="profile-options">{["Paul", "Chris"].map(name => <button className="profile-button" key={name} onClick={() => choosePerson(name)}>{name}<span>↗</span></button>)}</div>
    {error && <p className="error">{error}</p>}
  </section></main>;

  return <main className="app-shell">
    <header className="topbar"><Brand /><div className="header-actions"><button className="person-switch" onClick={() => choosePerson(person === "Paul" ? "Chris" : "Paul")}>Switch to {person === "Paul" ? "Chris" : "Paul"}</button><button className="icon-button" aria-label="Lock app" onClick={logout}><LogOut size={17}/></button></div></header>
    {screen === "home" ? <>
      <section className="greeting"><div><div className="eyebrow">LET'S GET AFTER IT</div><h2>Morning, {person}.</h2><p>Week {week} · {easternTime} Eastern</p></div><div className="week-mark"><span>WEEK</span><strong>{String(week).padStart(2,"0")}</strong></div></section>
      <section className="progress-card"><div className="progress-copy"><div className="eyebrow">THIS WEEK</div><strong>{completedThisWeek} of 4 workouts complete</strong><span>{completedThisWeek === 4 ? "That's a wrap. Nice work." : "Keep the rotation rolling."}</span><div className="progress-track"><i style={{width:`${completedThisWeek/4*100}%`}}/></div></div><div className="progress-icon"><Trophy size={21}/></div></section>
      <div className="section-heading"><div><div className="eyebrow">THE ROTATION</div><h3>Your workouts</h3></div><span className="muted-label">A – D</span></div>
      <section className="workout-list">{orderedWorkouts.map(w => {
        const done = payload.sessions.find(s => s.workoutId === w.id && s.week === week);
        return <button className={`workout-card ${done ? "is-complete" : ""}`} key={w.id} onClick={() => startWorkout(w.id)}>
          <span className="workout-letter">{done ? <Check size={20}/> : w.id}</span><span className="workout-info"><strong>{w.name}</strong><small>{done ? `Completed · ${new Date(done.completedAt).toLocaleDateString()}` : w.focus}</small></span><span className="workout-arrow">{done ? "✓" : "↗"}</span>
        </button>;
      })}</section>
      <button className="text-button" onClick={nextWeek}><RotateCcw size={14}/> Start week {week+1} · reset checkmarks & shuffle order</button>
      <div className="footer-note"><Clock3 size={14}/> Workout cutoff · 6:50 AM Eastern</div>
      {busy && <p className="muted-label">Syncing…</p>}
    </> : activeWorkout && <>
      <button className="back-button" onClick={() => {setScreen("home");setStartedAt(null);}}>← All workouts</button>
      <section className="greeting workout-heading"><div><div className="eyebrow">WORKOUT {activeWorkout.id} · WEEK {week}</div><h2>{activeWorkout.name}</h2><p>{activeWorkout.focus}</p></div></section>
      {notice && <div className="warning-banner"><Clock3 size={18}/><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
      <div className="workout-controls"><span className="muted-label">3 required supersets · 1 optional bonus</span><span className="muted-label">Started {new Date(startedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span></div>
      <section className="superset-list">{(payload.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2]).map((pairIndex,displayIndex) => {
        const pair = activeWorkout.pairs[pairIndex];
        const index = pairIndex;
        const complete = pair.every((_, ei) => payload.done?.[exerciseKey(workoutId,index,ei)]);
        return <article className={`superset-card ${complete ? "pair-complete" : ""}`} key={index}>
          <header><div><span className="eyebrow">SUPERSET {displayIndex+1}</span><strong>{complete ? "Complete" : "A + B"}</strong></div><button className={`pair-check ${complete ? "checked" : ""}`} onClick={() => togglePair(index)}>{complete ? <Check size={17}/> : "Done"}</button></header>
          {pair.map(([name,detail],ei) => <div className="exercise-row" key={name}><button className={`exercise-check ${payload.done?.[exerciseKey(workoutId,index,ei)] ? "checked" : ""}`} onClick={() => toggleExercise(index,ei)}>{payload.done?.[exerciseKey(workoutId,index,ei)] && <Check size={13}/>}</button><div className="exercise-name"><strong>{name}</strong><small>{detail}</small></div><label className="weight-input"><input inputMode="decimal" placeholder="—" value={payload.weights?.[name] || ""} onChange={e => updateWeight(name,e.target.value)}/><span>lb</span></label></div>)}
          <button className="rest-button" onClick={() => setRest(60)}><Timer size={14}/> Rest 60 sec</button>
        </article>;
      })}</section>
      <section className={`bonus-card ${expandedBonus ? "bonus-open" : ""}`}>
        <button className="bonus-toggle" onClick={() => {setExpandedBonus(v => !v);}}><div><div className="eyebrow">OPTIONAL BONUS ROUND</div><strong>Superset 4 · Feeling saucy?</strong><small>Extra credit. Not required to finish.</small></div><span>{expandedBonus ? <ChevronUp/> : <ChevronDown/>}</span></button>
        {expandedBonus && <div className="bonus-content">{activeWorkout.pairs[3].map(([name,detail],ei) => <div className="exercise-row" key={name}><button className={`exercise-check ${payload.done?.[exerciseKey(workoutId,3,ei)] ? "checked" : ""}`} onClick={() => toggleExercise(3,ei)}>{payload.done?.[exerciseKey(workoutId,3,ei)] && <Check size={13}/>}</button><div className="exercise-name"><strong>{name}</strong><small>{detail}</small></div><label className="weight-input"><input inputMode="decimal" placeholder="—" value={payload.weights?.[name] || ""} onChange={e => updateWeight(name,e.target.value)}/><span>lb</span></label></div>)}<button className="pair-check bonus-done" onClick={() => togglePair(3)}>Mark bonus complete</button></div>}
      </section>
      {rest > 0 && <div className="rest-overlay"><div><div className="eyebrow">REST TIMER</div><strong>{Math.floor(rest/60)}:{String(rest%60).padStart(2,"0")}</strong><button onClick={() => setRest(0)}>Skip rest</button></div></div>}
      <button className="primary-button complete-button" onClick={completeWorkout}> <Check size={18}/> Complete workout</button>
      <p className="small-note centered">You can finish after three supersets. Bonus work is always optional.</p>
    </>}
    {error && <p className="error">{error}</p>}
  </main>;
}

function Brand() {
  return <div className="brand-lockup"><div className="brand-mark"><Dumbbell size={19}/></div><div><div className="eyebrow">YOUR SHARED TRAINING PLAN</div><h1>Our Gym Plan<span>.</span></h1></div></div>;
}