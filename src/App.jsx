import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Clock3, Dumbbell, Lock, LogOut, RotateCcw, Timer, Trophy } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const TOKEN_KEY = "our-gym-plan-token";
const PERSON_KEY = "gym-person";
const WEEK_KEY = "gym-week";
const draftKey = profile => "our-gym-plan-draft-" + profile;

const PROGRAM = [
  { id: "A", name: "Upper Body 1", focus: "Chest · Back · Triceps", pairs: [
    [["DB bench press", "4 sets · 10 reps"], ["Lat pulldown", "4 sets · 10 reps"]],
    [["One-arm DB row", "4 sets · 10 each"], ["Rope triceps pressdown", "4 sets · 10 reps"]],
    [["Incline DB press", "4 sets · 10 reps"], ["Overhead DB triceps extension", "4 sets · 10 reps"]],
    [["Push-up", "Bonus · 4 sets · 10 reps"], ["Face pull", "Bonus · 4 sets · 10 reps"]]
  ]},
  { id: "B", name: "Lower Body", focus: "Quads · Hamstrings · Glutes", pairs: [
    [["Goblet squat", "4 sets · 10 reps"], ["DB Romanian deadlift", "4 sets · 10 reps"]],
    [["Leg press", "4 sets · 10 reps"], ["Seated hamstring curl", "4 sets · 10 reps"]],
    [["Standing calf raise", "4 sets · 10 reps"], ["Hip thrust machine", "4 sets · 10 reps"]],
    [["Reverse lunge", "Bonus · 4 sets · 10 reps"], ["Leg extension", "Bonus · 4 sets · 10 reps"]]
  ]},
  { id: "C", name: "Upper Body 2", focus: "Shoulders · Back · Biceps", pairs: [
    [["Seated DB shoulder press", "4 sets · 10 reps"], ["Chest-supported DB row", "4 sets · 10 reps"]],
    [["DB lateral raise", "4 sets · 10 reps"], ["Hammer curl", "4 sets · 10 reps"]],
    [["Face pull", "4 sets · 10 reps"], ["Alternating DB curl", "4 sets · 10 reps"]],
    [["Rear delt fly", "Bonus · 4 sets · 10 reps"], ["Incline DB curl", "Bonus · 4 sets · 10 reps"]]
  ]},
  { id: "D", name: "Full Body + Core", focus: "Strength · Stability · Core", pairs: [
    [["DB step-up", "4 sets · 10 each"], ["Incline push-up", "4 sets · 10 reps"]],
    [["DB deadlift", "4 sets · 10 reps"], ["Dead bug", "4 sets · 10 each"]],
    [["Pallof press", "4 sets · 10 each"], ["Front plank", "4 sets · 10 reps"]],
    [["Farmer carry", "Bonus · 4 sets · 10 reps"], ["Cable wood chop", "Bonus · 4 sets · 10 reps"]]
  ]}
];

const CORE_BREAKS = [
  ["Dead bug", "8–10 each side", "Slow, controlled reps. Keep your lower back steady."],
  ["Front plank", "20–30 seconds", "Brace your abs and glutes; keep a straight line."],
  ["Pallof press", "10 each side", "Press straight out and resist rotating toward the cable."],
  ["Cable wood chop", "10 each side", "Move diagonally with control; avoid yanking."],
  ["Reverse crunch", "10–12 reps", "Curl your hips gently off the floor without swinging."],
  ["Bird dog", "8–10 each side", "Reach opposite arm and leg while keeping hips level."],
  ["Side plank", "20–30 seconds each side", "Keep hips lifted and your body in a straight line."],
  ["Mountain climber", "20 total reps", "Move steadily while keeping your torso stable."],
  ["Bicycle crunch", "10–12 each side", "Rotate through your ribs and move slowly without pulling your neck."],
  ["Heel taps", "12–15 each side", "Keep shoulders slightly raised and reach side to side."],
  ["Bear plank shoulder tap", "8–10 each side", "Hover knees just off the floor and resist rocking your hips."],
  ["Glute bridge march", "8–10 each side", "Keep hips level as you slowly lift one foot at a time."]
];

const EXERCISE_GUIDES = {
  "DB bench press": ["Chest press using dumbbells on a flat bench.", ["Set feet firmly and keep shoulder blades gently tucked into the bench.", "Lower weights under control beside your chest.", "Press up without banging the dumbbells together."], "Avoid flaring elbows straight out or arching excessively."],
  "Lat pulldown": ["A vertical pull that trains your lats and upper back.", ["Brace your torso and grip just outside shoulder width.", "Pull the bar toward your upper chest, driving elbows down.", "Return slowly until arms are extended."], "Avoid swinging your torso or pulling the bar behind your neck."],
  "One-arm DB row": ["A single-arm row that builds your lats and mid-back.", ["Support one hand on the bench and keep your back flat.", "Pull the dumbbell toward your hip, not your shoulder.", "Lower until your arm is long without twisting."], "Avoid rotating your torso to heave the weight up."],
  "Rope triceps pressdown": ["An isolation exercise for the back of your upper arms.", ["Keep elbows tucked near your ribs.", "Straighten your arms by moving at the elbows.", "Separate the rope slightly at the bottom, then return slowly."], "Avoid letting your shoulders rock or elbows drift forward."],
  "Incline DB press": ["An angled chest press emphasizing the upper chest.", ["Set bench to a modest incline, around 20–30 degrees.", "Keep wrists stacked over elbows as you lower.", "Press up smoothly while keeping shoulders down."], "Avoid setting the bench too steep or letting elbows flare."],
  "Overhead DB triceps extension": ["A triceps-focused lift with the dumbbell overhead.", ["Keep ribs down and elbows pointing mostly forward.", "Bend elbows to lower the weight behind your head.", "Extend elbows without changing your upper-arm position."], "Avoid arching your lower back or letting elbows flare wide."],
  "Push-up": ["A bodyweight chest, shoulder and triceps press.", ["Make a straight line from head through heels.", "Place hands just outside shoulder width.", "Lower chest between hands, then push the floor away."], "Avoid sagging hips or craning your neck."],
  "Face pull": ["A cable pull that targets rear shoulders and upper back.", ["Set rope around face height and use a neutral grip.", "Pull toward your forehead, separating your hands.", "Keep shoulders down and control the return."], "Avoid leaning back or shrugging through the movement."],
  "Goblet squat": ["A squat holding one dumbbell close to your chest.", ["Hold the dumbbell close and brace your midsection.", "Sit down between your hips while keeping heels planted.", "Stand by pushing the floor away."], "Avoid heels lifting or knees collapsing inward."],
  "DB Romanian deadlift": ["A hip hinge that trains hamstrings and glutes.", ["Keep a soft bend in your knees and dumbbells close to legs.", "Push hips back while keeping your spine neutral.", "Stop when hamstrings feel stretched, then drive hips forward."], "Avoid turning it into a squat or rounding your back."],
  "Leg press": ["A machine squat pattern that emphasizes the quads and glutes.", ["Set feet about shoulder width on the platform.", "Lower until knees bend comfortably without hips curling up.", "Press through the whole foot without locking knees hard."], "Avoid letting knees cave in or lowering so far your pelvis rolls."],
  "Seated hamstring curl": ["A machine exercise that bends the knee to train hamstrings.", ["Align the machine pivot with your knee joint.", "Keep hips down and curl the pad toward you.", "Return slowly without letting the stack slam."], "Avoid lifting your hips or using momentum."],
  "Standing calf raise": ["A heel raise that strengthens the calf muscles.", ["Keep knees soft and stand tall.", "Rise onto the balls of your feet as high as comfortable.", "Pause briefly, then lower through a full stretch."], "Avoid bouncing through the bottom."],
  "Hip thrust machine": ["A loaded hip extension that emphasizes the glutes.", ["Position the pad across your hips and feet about hip width.", "Brace, then drive hips up by squeezing glutes.", "Finish with ribs down and hips extended, then lower slowly."], "Avoid over-arching your lower back at the top."],
  "Reverse lunge": ["A single-leg squat stepping backward to train legs and balance.", ["Step back far enough to keep the front heel planted.", "Lower both knees under control.", "Push through the front foot to return to standing."], "Avoid wobbling or letting the front knee collapse inward."],
  "Leg extension": ["A machine exercise that isolates the quadriceps.", ["Align the machine pivot with your knee.", "Extend knees smoothly without snapping them straight.", "Lower slowly through the full comfortable range."], "Avoid swinging the weight or lifting your hips."],
  "Seated DB shoulder press": ["An overhead press for shoulders and triceps.", ["Sit tall with feet planted and dumbbells near shoulder height.", "Brace your core and press overhead in a controlled path.", "Lower until elbows are just below shoulder level if comfortable."], "Avoid excessive lower-back arching or shrugging."],
  "Chest-supported DB row": ["A row with your chest supported to reduce body swing.", ["Set bench to a low incline and keep chest on the pad.", "Pull elbows toward your hips while keeping neck relaxed.", "Lower dumbbells slowly until arms extend."], "Avoid shrugging or lifting your chest off the pad."],
  "DB lateral raise": ["A shoulder isolation movement that raises arms out to the sides.", ["Use light weights and keep a slight bend in elbows.", "Raise arms out to the sides to about shoulder height.", "Lower slowly without swinging."], "Avoid shrugging or swinging the weights."],
  "Hammer curl": ["A biceps and forearm curl with palms facing inward.", ["Keep palms facing each other and elbows close to your sides.", "Curl without moving your upper arms.", "Lower slowly to full comfortable extension."], "Avoid rocking your torso to move the weight."],
  "Alternating DB curl": ["A single-arm-at-a-time biceps curl.", ["Keep elbows near your ribs and wrists straight.", "Curl one dumbbell toward your shoulder.", "Lower fully before alternating sides."], "Avoid swinging or letting elbows drift forward."],
  "Rear delt fly": ["A reverse fly that targets the rear shoulders and upper back.", ["Hinge forward or use a chest-supported bench.", "Keep a soft elbow bend and raise arms out wide.", "Squeeze shoulder blades gently, then lower slowly."], "Avoid using momentum or shrugging."],
  "Incline DB curl": ["A biceps curl performed seated against an incline bench.", ["Let arms hang naturally with palms forward.", "Curl without letting elbows travel forward.", "Lower slowly to a comfortable stretch."], "Avoid swinging or forcing the shoulder into an uncomfortable stretch."],
  "DB step-up": ["A single-leg step onto a stable bench or platform.", ["Use a platform height you can control.", "Plant the whole lead foot and lean slightly forward.", "Drive through the lead leg to stand; step down carefully."], "Avoid pushing hard off the trailing foot or letting the knee cave in."],
  "Incline push-up": ["A push-up with hands elevated to make the movement easier.", ["Use a stable bench or bar and keep body in a straight line.", "Lower chest toward the support with elbows angled back.", "Push away while keeping your core braced."], "Avoid letting hips sag or shoulders shrug."],
  "DB deadlift": ["A dumbbell deadlift from the floor or raised starting position.", ["Keep dumbbells close to your legs and brace before lifting.", "Hinge at hips and bend knees enough to reach the weights.", "Stand by pushing the floor away, keeping your back neutral."], "Avoid rounding your back or jerking the weights off the floor."],
  "Dead bug": ["A core stability drill that resists arching through your lower back.", ["Lie on your back with arms up and hips and knees at 90 degrees.", "Gently brace so your lower back stays steady.", "Slowly extend opposite arm and leg, then switch."], "Avoid letting your lower back lift off the floor."],
  "Pallof press": ["An anti-rotation core exercise using a cable or band.", ["Stand sideways to the anchor and hold handle at your chest.", "Brace and press hands straight out without rotating.", "Pause, then bring hands back under control."], "Avoid twisting toward the cable or leaning away."],
  "Front plank": ["A static core hold that trains the trunk to stay rigid.", ["Place elbows under shoulders and extend legs.", "Squeeze glutes and brace abs while breathing normally.", "Keep ears, shoulders, hips and ankles aligned."], "Avoid sagging hips or raising them too high."],
  "Farmer carry": ["A loaded walk that trains grip, core and posture.", ["Hold weights at your sides with shoulders relaxed.", "Stand tall, brace gently and walk with controlled steps.", "Keep the weights steady and turn carefully."], "Avoid leaning to one side or shrugging."],
  "Cable wood chop": ["A diagonal cable movement that trains trunk control.", ["Stand sideways to the cable with feet planted.", "Move the handle diagonally across your body with control.", "Let your upper body rotate naturally while hips stay stable."], "Avoid yanking with your arms or twisting through your lower back."]
};

function ExerciseGuide({ name }) {
  const guide = EXERCISE_GUIDES[name];
  if (!guide) return null;
  const videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise proper form demonstration")}`;
  return <details className="exercise-guide">
    <summary>How to do it · Watch demo <span>↗</span></summary>
    <p>{guide[0]}</p>
    <strong>Form cues</strong>
    <ul>{guide[1].map((cue, i) => <li key={i}>{cue}</li>)}</ul>
    <p className="guide-mistake"><b>Watch for:</b> {guide[2]}</p>
    <a href={videoUrl} target="_blank" rel="noreferrer">Watch video demos <span>↗</span></a>
  </details>;
}

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
const currentTimeKey = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

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
  const [workoutDate, setWorkoutDate] = useState(todayKey());
  const [workoutTime, setWorkoutTime] = useState(currentTimeKey());
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
    if (!person) return;
    try {
      const raw = localStorage.getItem(draftKey(person));
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft?.workoutId || !draft?.startedAt) return;
      setWorkoutId(draft.workoutId);
      setStartedAt(draft.startedAt);
      setWorkoutDate(draft.workoutDate || todayKey());
      setWorkoutTime(draft.workoutTime || currentTimeKey());
      setScreen("workout");
    } catch {
      localStorage.removeItem(draftKey(person));
    }
  }, [person]);

  useEffect(() => {
    if (!person) return;
    if (startedAt && workoutId) {
      localStorage.setItem(draftKey(person), JSON.stringify({ workoutId, startedAt, workoutDate, workoutTime }));
    }
  }, [person, workoutId, startedAt, workoutDate, workoutTime]);

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
    setStartedAt(null);
    setWorkoutId("");
    setPerson(name);
    setScreen("home");
  }

  function startWorkout(id) {
    const coreOrderKey = 'w' + week + '-' + id;
    if (!payload.coreOrder?.[coreOrderKey]) {
      const coreOrder = { ...(payload.coreOrder || {}), [coreOrderKey]: CORE_BREAKS.map((_, i) => i).sort(() => Math.random() - .5) };
      save({ ...payload, coreOrder });
    }
    setWorkoutId(id);
    setWorkoutDate(todayKey());
    setWorkoutTime(currentTimeKey());
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

  function setCoreStatus(coreName, status) {
    const coreStatus = { ...(payload.coreStatus || {}) };
    const key = `${startedAt}-${coreName}`;
    if (coreStatus[key] === status) delete coreStatus[key];
    else coreStatus[key] = status;
    save({ ...payload, coreStatus });
  }

  function togglePair(pairIndex) {
    const done = { ...(payload.done || {}) };
    const pair = activeWorkout.pairs[pairIndex];
    const complete = pair.every((_, exerciseIndex) => done[exerciseKey(workoutId, pairIndex, exerciseIndex)]);
    pair.forEach((_, exerciseIndex) => { done[exerciseKey(workoutId, pairIndex, exerciseIndex)] = !complete; });
    save({ ...payload, done });
  }

  function completeWorkout() {
    // Combine the selected local date and time into the saved completion timestamp.
    const [year, month, day] = workoutDate.split("-").map(Number);
    const [hours, minutes] = workoutTime.split(":").map(Number);
    const completedAt = new Date(year, month - 1, day, hours, minutes, 0).toISOString();
    const sessions = [...(payload.sessions || []), {
      id: crypto.randomUUID(), workoutId, week, profile: person,
      startedAt: startedAt || completedAt, completedAt, workoutDate,
      bonusDone: Boolean(payload.done?.[exerciseKey(workoutId, (payload.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3])[3], 0)] || payload.done?.[exerciseKey(workoutId, (payload.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3])[3], 1)]),
      coreSnapshot: (payload.coreOrder?.['w' + week + '-' + workoutId] || [0,1,2,3,4,5,6,7]).slice(0,3).map((coreIndex, displayIndex) => {
        const [name, prescription] = CORE_BREAKS[coreIndex];
        return { afterSuperset: displayIndex + 1, name, prescription, status: payload.coreStatus?.[`${startedAt}-${name}`] || "not recorded" };
      }),
      exerciseSnapshot: activeWorkout.pairs.map((pair, pairIndex) => pair.map(([name, detail], exerciseIndex) => ({ name, detail, weight: payload.weights?.[name] || "", completed: Boolean(payload.done?.[exerciseKey(workoutId, pairIndex, exerciseIndex)]) })))
    }];
    save({ ...payload, sessions });
    localStorage.removeItem(draftKey(person));
    setStartedAt(null);
    setScreen("home");
    setNotice("");
  }

  function nextWeek() {
    const nextWeek = week + 1;
    const supersetOrder = { ...(payload.supersetOrder || {}) };
    const coreOrder = { ...(payload.coreOrder || {}) };
    PROGRAM.forEach(workout => {
      supersetOrder['w' + nextWeek + '-' + workout.id] = [0, 1, 2, 3].sort(() => Math.random() - .5);
      coreOrder['w' + nextWeek + '-' + workout.id] = CORE_BREAKS.map((_, i) => i).sort(() => Math.random() - .5);
    });
    save({ ...payload, week: nextWeek, supersetOrder, coreOrder, done: {}, coreDone: {} });
  }

  function deleteWorkout(sessionId) {
    const session = (payload.sessions || []).find(item => item.id === sessionId);
    if (!session) return;
    const label = PROGRAM.find(item => item.id === session.workoutId)?.name || "this workout";
    if (!window.confirm(`Delete ${label} from your workout history? This cannot be undone.`)) return;
    const sessions = (payload.sessions || []).filter(item => item.id !== sessionId);
    save({ ...payload, sessions });
  }

  function updateWeight(name, value) {
    const weights = { ...(payload.weights || {}), [name]: value };
    save({ ...payload, weights });
  }

  function lastUsedWeight(name) {
    const sessions = [...(payload.sessions || [])].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
    for (const session of sessions) {
      const exercise = session.exerciseSnapshot?.flat().find(item => item.name === name && item.weight !== "");
      if (exercise) return exercise.weight;
    }
    return "";
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
      <button className="history-link" onClick={() => setScreen("history")}>View workout history <span>↗</span></button>
      {startedAt && workoutId && <button className="resume-workout" onClick={() => setScreen("workout")}><span><strong>Resume {PROGRAM.find(w => w.id === workoutId)?.name || "workout"}</strong><small>In-progress workout · saved on this device</small></span><span>↗</span></button>}
      <section className="workout-list">{orderedWorkouts.map(w => {
        const done = payload.sessions.find(s => s.workoutId === w.id && s.week === week);
        return <button className={`workout-card ${done ? "is-complete" : ""}`} key={w.id} onClick={() => startWorkout(w.id)}>
          <span className="workout-letter">{done ? <Check size={20}/> : w.id}</span><span className="workout-info"><strong>{w.name}</strong><small>{done ? `Completed · ${new Date(done.completedAt).toLocaleDateString()}` : w.focus}</small></span><span className="workout-arrow">{done ? "✓" : "↗"}</span>
        </button>;
      })}</section>
      <button className="text-button" onClick={nextWeek}><RotateCcw size={14}/> Start week {week+1} · reset checkmarks & shuffle order</button>
      <div className="footer-note"><Clock3 size={14}/> Workout cutoff · 6:50 AM Eastern</div>
      {busy && <p className="muted-label">Syncing…</p>}
    </> : screen === "history" ? <>
      <button className="back-button" onClick={() => setScreen("home")}>← Back to workouts</button>
      <section className="greeting"><div><div className="eyebrow">YOUR TRAINING LOG</div><h2>Workout history</h2><p>{payload.sessions?.length || 0} completed workouts</p></div></section>
      <section className="history-list">
        {[...(payload.sessions || [])].sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt)).map(session => {
          const workout = PROGRAM.find(w => w.id === session.workoutId);
          return <article className="history-card" key={session.id}>
            <div className="history-card-head"><div><span className="eyebrow">WEEK {session.week || "—"}</span><h3>{workout?.name || `Workout ${session.workoutId}`}</h3></div><time>{session.completedAt ? new Date(session.completedAt).toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"}) : "Date unavailable"}</time></div>
            <p className="history-time">{session.completedAt ? new Date(session.completedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}) : ""}</p>
            <div className="history-weights">
              <strong>Weights recorded</strong>
              {session.exerciseSnapshot?.flat().filter(item => item.weight !== "" && item.weight != null).length ? session.exerciseSnapshot.flat().filter(item => item.weight !== "" && item.weight != null).map(item => <div className="history-exercise-row" key={item.name}><span>{item.name}</span><span>{item.weight} lb</span></div>) : <p className="history-no-weights">No weights recorded</p>}
            </div>
            <button className="history-delete" onClick={() => deleteWorkout(session.id)}>Delete workout</button>
          </article>;
        })}
        {!payload.sessions?.length && <p className="history-empty">Your completed workouts will show up here.</p>}
      </section>
    </> : activeWorkout && <>
      <button className="back-button" onClick={() => setScreen("home")}>← All workouts</button>
      <section className="greeting workout-heading"><div><div className="eyebrow">WORKOUT {activeWorkout.id} · WEEK {week}</div><h2>{activeWorkout.name}</h2><p>{activeWorkout.focus}</p></div></section>
      {notice && <div className="warning-banner"><Clock3 size={18}/><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
      <div className="workout-controls"><span className="muted-label">3 required supersets · 1 optional bonus</span><div className="workout-datetime"><label className="workout-date-label">Workout date<input aria-label="Workout date" type="date" value={workoutDate} max={todayKey()} onChange={e => setWorkoutDate(e.target.value)} /></label><label className="workout-date-label">Completion time<input aria-label="Completion time" type="time" value={workoutTime} max={workoutDate === todayKey() ? currentTimeKey() : undefined} onChange={e => setWorkoutTime(e.target.value)} /></label></div><span className="muted-label">Started {new Date(startedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span></div>
      <section className="superset-list">{(payload.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3]).slice(0,3).map((pairIndex,displayIndex) => {
        const pair = activeWorkout.pairs[pairIndex];
        const index = pairIndex;
        const complete = pair.every((_, ei) => payload.done?.[exerciseKey(workoutId,index,ei)]);
        const coreIndex = (payload.coreOrder?.['w' + week + '-' + workoutId] || [0,1,2,3,4,5,6,7])[displayIndex];
        const core = CORE_BREAKS[coreIndex];
        return <div className="superset-and-core" key={index}>
        <article className={`superset-card ${complete ? "pair-complete" : ""}`}>
          <header><div><span className="eyebrow">SUPERSET {displayIndex+1}</span></div><button className={`pair-check ${complete ? "checked" : ""}`} onClick={() => togglePair(index)}>{complete ? <Check size={17}/> : "Done"}</button></header>
          {pair.map(([name,detail],ei) => <div className="exercise-row" key={name}><button className={`exercise-check ${payload.done?.[exerciseKey(workoutId,index,ei)] ? "checked" : ""}`} onClick={() => toggleExercise(index,ei)}>{payload.done?.[exerciseKey(workoutId,index,ei)] && <Check size={13}/>}</button><div className="exercise-name"><strong>{name}</strong><small>{detail}</small><ExerciseGuide name={name}/></div><label className="weight-input"><input inputMode="decimal" placeholder="—" value={payload.weights?.[name] || ""} onChange={e => updateWeight(name,e.target.value)}/><span>lb</span>{lastUsedWeight(name) !== "" && <small className="last-used-weight">Last used: {lastUsedWeight(name)} lb</small>}</label></div>)}
          <button className="rest-button" onClick={() => setRest(60)}><Timer size={14}/> Rest 60 sec</button>
        </article>
        <div className={`core-break ${payload.coreStatus?.[`${startedAt}-${core[0]}`] === "done" ? "core-done" : ""}`}>
          <div className="core-break-copy"><span className="eyebrow">OPTIONAL CORE BREAK</span><strong>{core[0]}</strong><small>{core[1]} · {core[2]}</small></div>
          <div className="core-actions">
            <button className={`core-action ${payload.coreStatus?.[`${startedAt}-${core[0]}`] === "done" ? "selected" : ""}`} onClick={() => setCoreStatus(core[0], "done")}><Check size={13}/> Done</button>
            <button className={`core-action ${payload.coreStatus?.[`${startedAt}-${core[0]}`] === "skipped" ? "selected" : ""}`} onClick={() => setCoreStatus(core[0], "skipped")}>Skip</button>
          </div>
          <ExerciseGuide name={core[0]}/>
        </div>
        </div>;
      })}</section>
      <section className={`bonus-card ${expandedBonus ? "bonus-open" : ""}`}>
        <button className="bonus-toggle" onClick={() => {setExpandedBonus(v => !v);}}><div><div className="eyebrow">OPTIONAL BONUS ROUND</div><strong>Superset 4 · Feeling saucy?</strong><small>Extra credit. Not required to finish.</small></div><span>{expandedBonus ? <ChevronUp/> : <ChevronDown/>}</span></button>
        {expandedBonus && (() => { const bonusIndex = (payload.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3])[3]; return <div className="bonus-content">{activeWorkout.pairs[bonusIndex].map(([name,detail],ei) => <div className="exercise-row" key={name}><button className={`exercise-check ${payload.done?.[exerciseKey(workoutId,bonusIndex,ei)] ? "checked" : ""}`} onClick={() => toggleExercise(bonusIndex,ei)}>{payload.done?.[exerciseKey(workoutId,bonusIndex,ei)] && <Check size={13}/>}</button><div className="exercise-name"><strong>{name}</strong><small>{detail}</small><ExerciseGuide name={name}/></div><label className="weight-input"><input inputMode="decimal" placeholder="—" value={payload.weights?.[name] || ""} onChange={e => updateWeight(name,e.target.value)}/><span>lb</span>{lastUsedWeight(name) !== "" && <small className="last-used-weight">Last used: {lastUsedWeight(name)} lb</small>}</label></div>)}<button className="pair-check bonus-done" onClick={() => togglePair(bonusIndex)}>Mark bonus complete</button></div>; })()}
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