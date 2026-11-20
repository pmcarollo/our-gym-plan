import { useState } from "react";
import { Check, Dumbbell, Lock, Timer, Trophy } from "lucide-react";

const workouts = [
  { id: "A", name: "Upper Body 1", focus: "Chest · Back · Triceps" },
  { id: "B", name: "Lower Body", focus: "Quads · Hamstrings · Glutes" },
  { id: "C", name: "Upper Body 2", focus: "Shoulders · Back · Biceps" },
  { id: "D", name: "Full Body + Core", focus: "Strength · Stability · Core" },
];

export default function App() {
  const [person, setPerson] = useState(() => localStorage.getItem("gym-person") || "");
  const [showPicker, setShowPicker] = useState(!person);

  function choosePerson(name) {
    localStorage.setItem("gym-person", name);
    setPerson(name);
    setShowPicker(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><Dumbbell size={19} strokeWidth={2.2} /></div>
        <div>
          <div className="eyebrow">YOUR SHARED TRAINING PLAN</div>
          <h1>Our Gym Plan<span>.</span></h1>
        </div>
        {person && <button className="person-switch" onClick={() => setShowPicker(true)}>{person}</button>}
      </header>

      {showPicker ? (
        <section className="welcome-panel">
          <div className="eyebrow">WHO'S WORKING OUT?</div>
          <h2>Good morning.</h2>
          <p>Choose your profile. We'll remember it on this device.</p>
          <div className="profile-options">
            {["Paul", "Chris"].map(name => (
              <button className="profile-button" key={name} onClick={() => choosePerson(name)}>
                <span>{name}</span><span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <p className="small-note"><Lock size={13} /> Passcode entry and secure sync are coming next.</p>
        </section>
      ) : (
        <>
          <section className="greeting">
            <div>
              <div className="eyebrow">LET'S GET AFTER IT</div>
              <h2>Morning, {person}.</h2>
              <p>Four workouts. Your pace. Keep it moving.</p>
            </div>
            <div className="week-mark"><span>WEEK</span><strong>01</strong></div>
          </section>

          <section className="progress-card">
            <div className="progress-copy">
              <div className="eyebrow">THIS WEEK</div>
              <strong>Ready when you are.</strong>
              <span>Workout progress will show here.</span>
            </div>
            <div className="progress-icon"><Trophy size={21} /></div>
          </section>

          <div className="section-heading">
            <div><div className="eyebrow">THE ROTATION</div><h3>Your workouts</h3></div>
            <span className="muted-label">A – D</span>
          </div>

          <section className="workout-list">
            {workouts.map((workout, index) => (
              <button className="workout-card" key={workout.id}>
                <span className="workout-letter">{workout.id}</span>
                <span className="workout-info"><strong>{workout.name}</strong><small>{workout.focus}</small></span>
                <span className="workout-arrow">↗</span>
              </button>
            ))}
          </section>

          <div className="footer-note"><Timer size={14} /> 6:50 AM is the finish line.</div>
        </>
      )}
    </main>
  );
}