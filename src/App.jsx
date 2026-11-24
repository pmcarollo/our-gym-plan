import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, Clock3, Dumbbell, ExternalLink, Library, Lock, LogOut, RefreshCw, RotateCcw, Settings, Timer, Trophy } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const TOKEN_KEY = "our-gym-plan-token";
const PERSON_KEY = "gym-person";
const WEEK_KEY = "gym-week";
const draftKey = profile => "our-gym-plan-draft-" + profile;
const TEST_PROFILE_KEY = "our-gym-plan-test-profile";

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
    [["Standing calf raise", "4 sets · 10 reps"], ["DB hip thrust", "4 sets · 10 reps"]],
    [["Reverse lunge", "Bonus · 4 sets · 10 reps"], ["Leg extension", "Bonus · 4 sets · 10 reps"]]
  ]},
  { id: "C", name: "Upper Body 2", focus: "Shoulders · Back · Biceps", pairs: [
    [["Seated DB shoulder press", "4 sets · 10 reps"], ["Chest-supported DB row", "4 sets · 10 reps"]],
    [["DB lateral raise", "4 sets · 10 reps"], ["Hammer curl", "4 sets · 10 reps"]],
    [["Face pull", "4 sets · 10 reps"], ["Alternating DB curl", "4 sets · 10 reps"]],
    [["Rear delt fly", "Bonus · 4 sets · 10 reps"], ["Incline DB curl", "Bonus · 4 sets · 10 reps"]]
  ]},
  { id: "D", name: "Full Body + Core", focus: "Strength · Stability · Core", pairs: [
    [["DB step-up", "4 sets · 10 each"], ["Smith machine bench press", "4 sets · 10 reps"]],
    [["DB deadlift", "4 sets · 10 reps"], ["Dead bug", "4 sets · 10 each"]],
    [["Pallof press", "4 sets · 10 each"], ["Front plank", "4 sets · 20–30 sec"]],
    [["DB split squat", "Bonus · 4 sets · 10 each"], ["Cable wood chop", "Bonus · 4 sets · 10 reps"]]
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


const WILD_CARD_POOLS = {
  push: [["Cable chest fly","4 sets · 12 reps"],["Close-grip push-up","4 sets · 8–12 reps"],["Smith machine bench press","4 sets · 10 reps"]],
  pull: [["Seated cable row","4 sets · 10 reps"],["Straight-arm pulldown","4 sets · 12 reps"],["Reverse-grip lat pulldown","4 sets · 10 reps"],["Cable rear-delt row","4 sets · 12 reps"]],
  legs: [["DB split squat","4 sets · 8 each"],["Lateral lunge","4 sets · 8 each"],["Single-leg DB Romanian deadlift","4 sets · 8 each"],["Smith machine squat","4 sets · 10 reps"]],
  finisher: [["Rower sprint","4 rounds · 30 sec"],["Bike sprint","4 rounds · 30 sec"],["Incline treadmill walk","4 rounds · 1 min"]]
};

function stravaWorkoutText(session) {
  const lines = [];
  const normalizeRange = value => value.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const formatExercise = (item) => {
    const detail = item.detail || "";
    const metric = exerciseMetric(item.name);
    const weight = item.weight !== "" && item.weight != null ? ` ${item.weight}${metric === "lb" ? "lbs" : " " + metric}` : "";
    let prescription = "";
    let match = detail.match(/(\d+)\s+sets?\s*[·x]\s*(\d+)\s*(reps?|each)/i);
    if (match) {
      prescription = `${match[1]}x${match[2]}${/each/i.test(match[3]) ? " each side" : ""}`;
    } else if ((match = detail.match(/(\d+)\s+(?:sets?|rounds?)\s*[·x]\s*([\d–—-]+)\s*(sec(?:onds?)?)/i))) {
      prescription = `${match[1]}x${normalizeRange(match[2])} sec`;
    } else if ((match = detail.match(/(\d+)\s+carries?\s*[·x]\s*([\d–—-]+)\s*(yd|yards?)/i))) {
      prescription = `${match[1]} carries of ${normalizeRange(match[2])} yd`;
    } else if ((match = detail.match(/(\d+)\s+sets?\s*[·x]\s*(\d+)\s*(?:reps?)?/i))) {
      prescription = `${match[1]}x${match[2]}`;
    } else {
      prescription = detail.replace(/\s*[·]\s*/g, " ").trim();
    }
    return `${prescription} ${item.name}${weight}`.trim();
  };
  (session.exerciseSnapshot || []).flat().filter(item => item.completed).forEach(item => {
    const sets = Array.isArray(item.sets) ? item.sets.filter(set => set.completed) : [];
    if (!sets.length) { lines.push(formatExercise(item)); return; }
    const reps = (item.detail.match(/(\d+)\s+sets?\s*[·x]\s*(\d+)/i) || [])[2] || "";
    const metric = exerciseMetric(item.name);
    const groups = [];
    sets.forEach(set => {
      const weight = set.weight ?? item.weight ?? "";
      const key = weight + "|" + reps;
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.count++;
      else groups.push({ key, count: 1, weight });
    });
    groups.forEach(group => lines.push(group.count + "x" + reps + " " + item.name + (group.weight !== "" ? " " + group.weight + (metric === "lb" ? "lbs" : " " + metric) : "")));
  });
  (session.coreSnapshot || []).filter(item => item.status === "done").forEach(item => {
    const detail = item.prescription || "";
    const match = detail.match(/([\d–—-]+)\s*(?:reps?)?\s*each(?:\s+side)?/i);
    const timed = detail.match(/([\d–—-]+)\s*(sec(?:onds?)?)/i);
    const prescription = match ? `${normalizeRange(match[1])} reps each side` : timed ? `${normalizeRange(timed[1])} sec` : detail;
    lines.push(`${prescription} ${item.name}`.trim());
  });
  return lines.join("\n");
}

function seededRandom(seedText) {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle(items, seedText) {
  const random = seededRandom(seedText);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function currentCalendarWeekKey(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return utcDate.getUTCFullYear() + "-W" + String(weekNumber).padStart(2, "0");
}
function generateWildCard(week, disabledExercises = []) {
  // Deterministic within a profile/week; disabled movements are excluded.
  const seed = "our-gym-plan-wildcard-v1-week-" + week;
  const available = pool => pool.filter(([name]) => !disabledExercises.includes(name));
  const push = seededShuffle(available(WILD_CARD_POOLS.push), seed + "-push").slice(0,2);
  const pull = seededShuffle(available(WILD_CARD_POOLS.pull), seed + "-pull").slice(0,2);
  const legs = seededShuffle(available(WILD_CARD_POOLS.legs), seed + "-legs").slice(0,2);
  const finisher = seededShuffle(available(WILD_CARD_POOLS.finisher), seed + "-finisher").slice(0,2);
  if ([push,pull,legs,finisher].some(group => group.length < 2)) throw new Error("Keep at least two available exercises in each Wild Card category.");
  const pairs = [
    ...seededShuffle([[push[0],pull[0]],[legs[0],finisher[0]],[push[1],pull[1]]], seed + "-pair-order"),
    [legs[1],finisher[1]]
  ];
  const comboKey = pairs.flat().map(item => item[0]).sort().join("|");
  const coreOrder = seededShuffle(CORE_BREAKS.map((_, i) => i).filter(i => !disabledExercises.includes(CORE_BREAKS[i][0])), seed + "-core").slice(0,2);
  return {id:"E",name:"Wild Card",focus:"Push · Pull · Legs · Finisher",pairs,comboKey,coreOrder};
}

const EXERCISE_GUIDES = {


  "Reverse crunch":["A controlled lower-ab exercise that curls the pelvis off the floor.",["Lie on your back with knees bent and hips at about 90 degrees.","Brace your abs and curl your tailbone a few inches off the floor.","Lower slowly without swinging your legs."],"Avoid using momentum or pulling your knees forcefully toward your chest."],
  "Bird dog":["A core stability drill that challenges balance while keeping the trunk steady.",["Start on hands and knees with hands under shoulders.","Reach one arm forward and the opposite leg back.","Pause, return slowly and alternate sides."],"Avoid rotating your hips or arching your lower back."],
  "Side plank":["A side-facing plank that trains the obliques and lateral core.",["Lie on your side with elbow directly below your shoulder.","Lift hips so your body forms a straight line.","Hold while breathing steadily, then switch sides."],"Avoid letting hips sag or shrugging your supporting shoulder."],
  "Mountain climber":["A moving plank variation that adds a conditioning element.",["Start in a high plank with shoulders over wrists.","Drive one knee toward your chest while keeping hips level.","Alternate legs at a steady, controlled pace."],"Avoid bouncing your hips high or letting your lower back sag."],
  "Bicycle crunch":["A rotational abdominal exercise performed on your back.",["Lie back with hands lightly supporting your head and knees lifted.","Bring opposite shoulder toward knee as the other leg extends.","Alternate slowly, rotating through your ribs."],"Avoid pulling on your neck or rushing the movement."],
  "Heel taps":["A short-range oblique exercise that reaches side to side.",["Lie on your back with knees bent and feet flat.","Lift shoulders slightly and reach one hand toward the same-side heel.","Alternate sides while keeping your abs braced."],"Avoid straining your neck or rocking your whole torso."],
  "Bear plank shoulder tap":["A quadruped core drill with knees hovering just off the floor.",["Start on hands and knees, then lift knees an inch or two.","Brace and tap one hand to the opposite shoulder.","Alternate while keeping hips as still as possible."],"Avoid rocking side to side or letting your back sag."],
  "Glute bridge march":["A glute and core stability drill that alternates leg lifts from a bridge.",["Lie on your back with knees bent and feet planted.","Lift hips into a bridge and keep them level.","Lift one foot a few inches, lower, then alternate."],"Avoid letting your hips drop or arching your lower back."],
  "DB floor press":["A dumbbell chest press on the floor, which limits the bottom range of motion.",["Lie on the floor with knees bent and dumbbells above your chest.","Lower until upper arms gently touch the floor.","Press up smoothly without bouncing your elbows."],"Avoid flaring elbows or letting wrists bend back."],
  "Cable chest fly":["A cable isolation movement for the chest.",["Set pulleys around chest height and take a small step forward.","Keep a soft elbow bend and bring hands together in front of your chest.","Open arms slowly to a comfortable stretch."],"Avoid turning it into a press or over-stretching your shoulders."],
  "Close-grip push-up":["A push-up variation that places more emphasis on the triceps.",["Set hands just inside shoulder width under your chest.","Keep elbows angled back as you lower.","Press the floor away while keeping your body in a straight line."],"Avoid letting elbows flare or hips sag."],
  "Smith machine bench press":["A guided-bar chest press. Set safety stops before loading.",["Set the bench so the bar lowers to mid-chest.","Set safety stops just below your comfortable bottom position.","Lower under control and press without bouncing."],"Avoid setting safety stops too low or pressing without a spotter when lifting heavy."],
  "Seated cable row":["A horizontal cable pull for the mid-back and lats.",["Sit tall with knees slightly bent and brace your trunk.","Pull the handle toward your lower ribs, keeping elbows close.","Extend arms slowly without rounding your back."],"Avoid rocking your torso to move the weight."],
  "Straight-arm pulldown":["A cable lat exercise that keeps elbows mostly straight.",["Set the cable high and stand far enough back to create tension.","Keep a slight elbow bend and sweep the bar toward your thighs.","Return slowly without arching."],"Avoid bending elbows into a triceps pressdown."],
  "Reverse-grip lat pulldown":["A lat pulldown using an underhand grip.",["Grip the bar around shoulder width with palms facing you.","Brace and pull toward your upper chest.","Return slowly while keeping shoulders controlled."],"Avoid leaning far back or pulling behind your neck."],
  "Cable rear-delt row":["A cable row emphasizing rear shoulders and upper back.",["Set cables around upper-chest height and use a wide grip.","Pull hands outward toward your upper chest.","Squeeze gently, then return under control."],"Avoid shrugging or using momentum."],
  "DB split squat":["A stationary single-leg squat holding dumbbells at your sides.",["Take a staggered stance with feet on separate tracks.","Lower straight down while keeping the front heel planted.","Drive through the front foot to stand."],"Avoid letting the front knee collapse inward."],
  "Lateral lunge":["A side-to-side lunge that trains the hips and legs in a different plane.",["Stand tall and take a wide step to one side.","Sit hips back over the stepping leg while the other leg stays long.","Push through the bent leg to return to center."],"Avoid letting the stepping foot roll inward."],
  "Single-leg DB Romanian deadlift":["A single-leg hip hinge for hamstrings, glutes and balance.",["Hinge at the hip as the free leg reaches back.","Keep hips square and spine neutral.","Return to standing with control."],"Avoid rotating your hips open or rounding your back."],
  "Smith machine squat":["A guided-bar squat variation. Set the safety stops before loading.",["Position the bar comfortably across your upper back and set feet securely.","Brace and squat to a depth you can control.","Drive through the whole foot to stand."],"Avoid bouncing at the bottom or letting knees cave inward."],
  "Elliptical intervals":["A low-impact conditioning interval on the elliptical.",["Set resistance and incline to a moderate level you can sustain.","Build to a brisk pace for the work interval while staying upright.","Ease off during recovery and keep the motion smooth."],"Avoid leaning heavily on the handles or letting your stride get choppy."],
  "Rower sprint":["A short rowing-machine interval. Focus on smooth power rather than all-out speed.",["Push with legs first, then lean back slightly and pull the handle in.","Recover hands away, hinge forward, then bend knees.","Use a sustainable hard effort for each interval."],"Avoid yanking with your arms first or rushing recovery."],
  "Bike sprint":["A short interval on the upright or recumbent bike.",["Set resistance so you can pedal quickly with control.","Build speed smoothly for the work interval.","Ease off and pedal lightly during recovery."],"Avoid resistance so high that your cadence breaks down."],
  "Incline treadmill walk":["A brisk uphill walk for a low-impact conditioning finisher.",["Choose a moderate incline and a pace you can control.","Walk tall without leaning heavily on the rails.","Reduce incline or speed if your form changes."],"Avoid hanging on the rails or choosing an incline that strains your back."],
  "DB bench press": ["Chest press using dumbbells on a flat bench. Dumbbells remain the default; the Smith machine is an occasional stable barbell alternative if you want to change things up.", ["Set feet firmly and keep shoulder blades gently tucked into the bench.", "Lower weights under control beside your chest.", "Press up without banging the dumbbells together."], "Avoid flaring elbows straight out or arching excessively."],
  "Lat pulldown": ["A vertical pull that trains your lats and upper back.", ["Brace your torso and grip just outside shoulder width.", "Pull the bar toward your upper chest, driving elbows down.", "Return slowly until arms are extended."], "Avoid swinging your torso or pulling the bar behind your neck."],
  "One-arm DB row": ["A single-arm row that builds your lats and mid-back.", ["Support one hand on the bench and keep your back flat.", "Pull the dumbbell toward your hip, not your shoulder.", "Lower until your arm is long without twisting."], "Avoid rotating your torso to heave the weight up."],
  "Rope triceps pressdown": ["An isolation exercise for the back of your upper arms.", ["Keep elbows tucked near your ribs.", "Straighten your arms by moving at the elbows.", "Separate the rope slightly at the bottom, then return slowly."], "Avoid letting your shoulders rock or elbows drift forward."],
  "Incline DB press": ["An angled chest press emphasizing the upper chest.", ["Set bench to a modest incline, around 20–30 degrees.", "Keep wrists stacked over elbows as you lower.", "Press up smoothly while keeping shoulders down."], "Avoid setting the bench too steep or letting elbows flare."],
  "Overhead DB triceps extension": ["A triceps-focused lift with the dumbbell overhead.", ["Keep ribs down and elbows pointing mostly forward.", "Bend elbows to lower the weight behind your head.", "Extend elbows without changing your upper-arm position."], "Avoid arching your lower back or letting elbows flare wide."],
  "Push-up": ["A bodyweight chest, shoulder and triceps press.", ["Make a straight line from head through heels.", "Place hands just outside shoulder width.", "Lower chest between hands, then push the floor away."], "Avoid sagging hips or craning your neck."],
  "Face pull": ["A cable pull that targets rear shoulders and upper back.", ["Set rope around face height and use a neutral grip.", "Pull toward your forehead, separating your hands.", "Keep shoulders down and control the return."], "Avoid leaning back or shrugging through the movement."],
  "Goblet squat": ["A squat holding one dumbbell close to your chest. Keep this as the default; a Smith machine squat is an optional variation when you want to load the movement differently.", ["Hold the dumbbell close and brace your midsection.", "Sit down between your hips while keeping heels planted.", "Stand by pushing the floor away."], "Avoid heels lifting or knees collapsing inward."],
  "DB Romanian deadlift": ["A hip hinge that trains hamstrings and glutes.", ["Keep a soft bend in your knees and dumbbells close to legs.", "Push hips back while keeping your spine neutral.", "Stop when hamstrings feel stretched, then drive hips forward."], "Avoid turning it into a squat or rounding your back."],
  "Leg press": ["A machine squat pattern that emphasizes the quads and glutes.", ["Set feet about shoulder width on the platform.", "Lower until knees bend comfortably without hips curling up.", "Press through the whole foot without locking knees hard."], "Avoid letting knees cave in or lowering so far your pelvis rolls."],
  "Seated hamstring curl": ["A machine exercise that bends the knee to train hamstrings.", ["Align the machine pivot with your knee joint.", "Keep hips down and curl the pad toward you.", "Return slowly without letting the stack slam."], "Avoid lifting your hips or using momentum."],
  "Standing calf raise": ["A heel raise that strengthens the calf muscles.", ["Keep knees soft and stand tall.", "Rise onto the balls of your feet as high as comfortable.", "Pause briefly, then lower through a full stretch."], "Avoid bouncing through the bottom."],
  "DB hip thrust": ["A dumbbell-loaded hip extension that emphasizes the glutes. A Smith machine can be used as an optional heavier variation once you are comfortable with the setup.", ["Sit with your upper back supported against a flat bench and place a padded dumbbell across your hip crease.", "Plant your feet about hip-width apart and drive through your whole foot to raise your hips.", "Finish with your ribs down and glutes squeezed, then lower under control."], "Avoid over-arching your lower back or placing an unpadded dumbbell directly on your hip bones."],
  "Smith machine hip thrust": ["A guided-bar variation that makes it easier to load a hip thrust progressively. Use a proper bar pad and set the safety stops before starting.", ["Sit with your upper back against a bench and position the padded Smith bar across your hip crease.", "Unlock the bar, plant your feet and drive hips upward until your torso is roughly parallel to the floor.", "Lower with control and re-rack the bar securely before changing your setup."], "Avoid starting without checking the bar hooks and safety stops. The bar should rest on your hips, not your stomach."],
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

const EXERCISE_METRICS = {
  "Push-up": "reps", "Incline push-up": "reps", "Close-grip push-up": "reps",
  "Dead bug": "reps", "Pallof press": "reps", "Cable wood chop": "reps",
  "Reverse crunch": "reps", "Bird dog": "reps", "Mountain climber": "reps",
  "Bicycle crunch": "reps", "Heel taps": "reps", "Bear plank shoulder tap": "reps",
  "Glute bridge march": "reps",
  "Front plank": "sec", "Side plank": "sec", "Rower sprint": "sec",
  "Bike sprint": "sec", "Incline treadmill walk": "sec", "Elliptical intervals": "sec"
};
const exerciseMetric = name => EXERCISE_METRICS[name] || "lb";

const EXERCISE_MUSCLES = {
  "DB bench press":["Chest","Triceps","Shoulders"],"Lat pulldown":["Back","Biceps"],
  "One-arm DB row":["Back","Biceps"],"Rope triceps pressdown":["Triceps"],
  "Incline DB press":["Chest","Shoulders","Triceps"],"Overhead DB triceps extension":["Triceps"],
  "Push-up":["Chest","Triceps","Shoulders"],"Face pull":["Shoulders","Back"],
  "Goblet squat":["Quads","Glutes"],"DB Romanian deadlift":["Hamstrings","Glutes"],
  "Leg press":["Quads","Glutes"],"Seated hamstring curl":["Hamstrings"],
  "Standing calf raise":["Calves"],"DB hip thrust":["Glutes","Hamstrings"],
  "Reverse lunge":["Quads","Glutes","Hamstrings"],"Leg extension":["Quads"],
  "Seated DB shoulder press":["Shoulders","Triceps"],"Chest-supported DB row":["Back","Biceps"],
  "DB lateral raise":["Shoulders"],"Hammer curl":["Biceps","Forearms"],
  "Alternating DB curl":["Biceps"],"Rear delt fly":["Shoulders","Back"],
  "Incline DB curl":["Biceps"],"DB step-up":["Quads","Glutes"],
  "Incline push-up":["Chest","Triceps","Shoulders"],"DB deadlift":["Hamstrings","Glutes"],
  "Dead bug":["Core"],"Pallof press":["Core"],"Front plank":["Core"],
  "Farmer carry":["Grip","Core","Forearms"],"Cable wood chop":["Core","Obliques"],
  "Reverse crunch":["Core"],"Bird dog":["Core"],"Side plank":["Core","Obliques"],
  "Mountain climber":["Core","Conditioning"],"Bicycle crunch":["Core","Obliques"],
  "Heel taps":["Core","Obliques"],"Bear plank shoulder tap":["Core","Shoulders"],
  "Glute bridge march":["Glutes","Core"],"DB floor press":["Chest","Triceps"],
  "Cable chest fly":["Chest"],"Close-grip push-up":["Triceps","Chest"],
  "Smith machine bench press":["Chest","Triceps"],"Seated cable row":["Back","Biceps"],
  "Straight-arm pulldown":["Back"],"Reverse-grip lat pulldown":["Back","Biceps"],
  "Cable rear-delt row":["Back","Shoulders"],"DB split squat":["Quads","Glutes"],
  "Lateral lunge":["Quads","Glutes"],"Single-leg DB Romanian deadlift":["Hamstrings","Glutes"],
  "Smith machine squat":["Quads","Glutes"],"Rower sprint":["Conditioning","Back","Legs"],
  "Bike sprint":["Conditioning","Legs"],"Incline treadmill walk":["Conditioning","Legs"],
  "Elliptical intervals":["Conditioning","Legs"]
};
function buildExerciseLibrary() {
  const items = new Map();
  const add = (name, prescription, source) => {
    const item = items.get(name) || { name, muscles: EXERCISE_MUSCLES[name] || ["Full body"], prescriptions: [], sources: [] };
    if (prescription && !item.prescriptions.includes(prescription)) item.prescriptions.push(prescription);
    if (!item.sources.includes(source)) item.sources.push(source);
    items.set(name, item);
  };
  PROGRAM.forEach(workout => workout.pairs.forEach((pair, pairIndex) => pair.forEach(([name, prescription]) => { add(name, prescription, workout.name); if (pairIndex === 3) add(name, prescription, "Bonus"); })));
  Object.values(WILD_CARD_POOLS).flat().forEach(([name, prescription]) => add(name, prescription, "Wild Card"));
  CORE_BREAKS.forEach(([name, prescription]) => add(name, prescription, "Optional core"));
  return [...items.values()].sort((a,b) => a.name.localeCompare(b.name));
}
const EXERCISE_LIBRARY = buildExerciseLibrary();
const LIBRARY_FILTERS = ["All","Chest","Back","Shoulders","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves","Core","Conditioning","Grip"];
const LIBRARY_SOURCE_FILTERS = ["All","Upper Body 1","Lower Body","Upper Body 2","Full Body + Core","Bonus","Wild Card","Optional core"];

function ExerciseGuide({ name }) {
  const guide = EXERCISE_GUIDES[name];
  if (!guide) return null;
  const videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise proper form demonstration")}`;
  return <details className="exercise-guide">
    <summary><span className="guide-summary-closed"><Dumbbell size={14}/> How to</span><span className="guide-summary-open">Hide guide <ChevronUp size={14}/></span><ChevronDown className="guide-chevron" size={14}/></summary>
    <p>{guide[0]}</p>
    <strong>Form cues</strong>
    <ul>{guide[1].map((cue, i) => <li key={i}>{cue}</li>)}</ul>
    <p className="guide-mistake"><b>Watch for:</b> {guide[2]}</p>
    <a href={videoUrl} target="_blank" rel="noreferrer">Watch video demos <ExternalLink size={15} strokeWidth={2}/></a>
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
  const [sharedProgram, setSharedProgram] = useState({ week: 1, supersetOrder: {}, coreOrder: {}, disabledExercises: [], rotation: {} });
  const [screen, setScreen] = useState("home");
  const [libraryFilter, setLibraryFilter] = useState("All");
  const [librarySourceFilter, setLibrarySourceFilter] = useState("All");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryMessage, setLibraryMessage] = useState("");
  const [workoutId, setWorkoutId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [workoutDate, setWorkoutDate] = useState(todayKey());
  const [workoutTime, setWorkoutTime] = useState(currentTimeKey());
  const [rest, setRest] = useState(0);
  const [expandedBonus, setExpandedBonus] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [wildCardWorkout, setWildCardWorkout] = useState(null);
  const [viewSessionId, setViewSessionId] = useState(null);
  const [editingCompletedSession, setEditingCompletedSession] = useState(false);
  const [stravaCopiedId, setStravaCopiedId] = useState(null);
  const [currentWorkoutWeights, setCurrentWorkoutWeights] = useState({});
  const [currentWorkoutSets, setCurrentWorkoutSets] = useState({});
  const [trackerModal, setTrackerModal] = useState(false);
  const [trackerNameDraft, setTrackerNameDraft] = useState("");

  const viewedSession = (payload.sessions || []).find(session => session.id === viewSessionId) || null;

  const week = person === "Test" ? (payload.week || 1) : sharedProgram.week;
  const activeWorkout = PROGRAM.find(w => w.id === workoutId) || (workoutId === "E" ? wildCardWorkout : null);
  const activePairOrder = activeWorkout
    ? (sharedProgram.supersetOrder?.['w' + week + '-' + workoutId] || [0, 1, 2, 3]).slice(0, 3)
    : [];
  const totalRequiredExercises = activePairOrder.length * 2;
  const bonusPairIndex = (sharedProgram.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3])[3];
  const completedBonusExercises = activeWorkout?.pairs?.[bonusPairIndex]
    ? activeWorkout.pairs[bonusPairIndex].filter((_, ei) => payload.done?.[exerciseKey(workoutId, bonusPairIndex, ei)]).length
    : 0;
  const completedRequiredExercises = activeWorkout
    ? activePairOrder.reduce((count, pairIndex) => count + activeWorkout.pairs[pairIndex].filter((_, exerciseIndex) => payload.done?.[exerciseKey(workoutId, pairIndex, exerciseIndex)]).length, 0)
    : 0;
  const completedThisWeek = useMemo(() => (payload.sessions || []).filter(s => s.week === week && s.completedAt).length, [payload, week]);

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
      setWildCardWorkout(draft.workoutSnapshot || null);
      setStartedAt(draft.startedAt);
      setWorkoutDate(draft.workoutDate || todayKey());
      setWorkoutTime(draft.workoutTime || currentTimeKey());
      setCurrentWorkoutWeights(draft.currentWorkoutWeights || {});
      setCurrentWorkoutSets(draft.currentWorkoutSets || {});
      setScreen("workout");
    } catch {
      localStorage.removeItem(draftKey(person));
    }
  }, [person]);

  useEffect(() => {
    if (!person) return;
    if (startedAt && workoutId) {
      localStorage.setItem(draftKey(person), JSON.stringify({ workoutId, startedAt, workoutDate, workoutTime, workoutSnapshot: wildCardWorkout, currentWorkoutWeights, currentWorkoutSets }));
    }
  }, [person, workoutId, startedAt, workoutDate, workoutTime, wildCardWorkout, currentWorkoutWeights, currentWorkoutSets]);

  async function loadProfile() {
    try {
      setBusy(true);
      if (person === "Test") {
        const stored = localStorage.getItem(TEST_PROFILE_KEY);
        const testPayload = stored ? JSON.parse(stored) : emptyPayload();
        setPayload(testPayload && typeof testPayload === "object" ? testPayload : emptyPayload());
        setSharedProgram({ week: testPayload.week || 1, supersetOrder: testPayload.supersetOrder || {}, coreOrder: testPayload.coreOrder || {}, disabledExercises: testPayload.disabledExercises || [], rotation: testPayload.rotation || {} });
      } else {
        const result = await api("load", { token, profile: person });
        const profile = result.profiles?.find(p => p.profile === person);
        const ownPayload = profile?.payload && Object.keys(profile.payload).length ? profile.payload : emptyPayload();
        let shared = ownPayload.sharedProgram;
        if (person !== "Paul") {
          const paulResult = await api("load", { token, profile: "Paul" });
          const paulPayload = paulResult.profiles?.find(p => p.profile === "Paul")?.payload || {};
          shared = paulPayload.sharedProgram || (Object.keys(paulPayload).length ? { week: paulPayload.week, supersetOrder: paulPayload.supersetOrder,
            coreOrder: paulPayload.coreOrder, disabledExercises: paulPayload.disabledExercises, rotation: paulPayload.rotation } : {
            week: ownPayload.week, supersetOrder: ownPayload.supersetOrder, coreOrder: ownPayload.coreOrder,
            disabledExercises: ownPayload.disabledExercises, rotation: ownPayload.rotation });
        } else if (!shared) {
          shared = { week: ownPayload.week, supersetOrder: ownPayload.supersetOrder, coreOrder: ownPayload.coreOrder,
            disabledExercises: ownPayload.disabledExercises, rotation: ownPayload.rotation };
        }
        setSharedProgram({ week: Math.max(1, Number(shared?.week) || 1), supersetOrder: shared?.supersetOrder || {},
          coreOrder: shared?.coreOrder || {}, disabledExercises: shared?.disabledExercises || [], rotation: shared?.rotation || {} });
        setPayload(ownPayload);
      }
      setError("");
    } catch (e) {
      setError(e.message);
      if (e.message.toLowerCase().includes("session expired")) logout();
    } finally { setBusy(false); }
  }

  async function save(next) {
    setPayload(next);
    try {
      if (person === "Test") localStorage.setItem(TEST_PROFILE_KEY, JSON.stringify(next));
      else await api("save", { token, profile: person, payload: person === "Paul" ? { ...next, sharedProgram } : next });
      setError("");
    } catch (e) { setError(e.message); }
  }

  async function saveSharedProgram(next) {
    const normalized = { ...sharedProgram, ...next };
    setSharedProgram(normalized);
    if (person === "Paul") setPayload(current => ({ ...current, sharedProgram: normalized }));
    if (person === "Test") {
      const local = { ...payload, week: normalized.week, supersetOrder: normalized.supersetOrder, coreOrder: normalized.coreOrder, disabledExercises: normalized.disabledExercises };
      setPayload(local); localStorage.setItem(TEST_PROFILE_KEY, JSON.stringify(local)); return;
    }
    try {
      const result = await api("load", { token, profile: "Paul" });
      const paulPayload = result.profiles?.find(p => p.profile === "Paul")?.payload || emptyPayload();
      await api("save", { token, profile: "Paul", payload: { ...paulPayload, sharedProgram: normalized } });
      if (person === "Paul") setPayload(current => ({ ...current, sharedProgram: normalized }));
      setError("");
    } catch (e) { setError("Couldn't sync the shared workout plan: " + e.message); }
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

  async function forceRefreshApp() {
    try {
      if ("caches" in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map(name => window.caches.delete(name)));
      }
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      }
    } catch (e) {
      // A cache cleanup failure should not prevent the cache-busted reload.
    }
    const refreshUrl = new URL(window.location.href);
    refreshUrl.searchParams.set("refresh", Date.now().toString());
    window.location.replace(refreshUrl.toString());
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
    setWildCardWorkout(null);
    setPerson(name);
    setScreen("home");
  }

  function discardWorkout() {
    setActiveModal({ eyebrow: "CURRENT WORKOUT", title: "Discard this workout?", description: "Your in-progress workout and weights entered during this session will be cleared. Completed workout history and previously saved weights will stay intact.", confirmLabel: "Discard workout", destructive: true, onConfirm: discardWorkoutNow });
  }

  function discardWorkoutNow() {
    localStorage.removeItem(draftKey(person));
    const done = { ...(payload.done || {}) };
    Object.keys(done).filter(key => key.startsWith(`${workoutId}-p`)).forEach(key => delete done[key]);
    const coreStatus = { ...(payload.coreStatus || {}) };
    Object.keys(coreStatus).filter(key => key.startsWith(`${startedAt}-`)).forEach(key => delete coreStatus[key]);

    save({ ...payload, done, coreStatus });
    setCurrentWorkoutWeights({});
    setStartedAt(null);
    setWorkoutId("");
    setWildCardWorkout(null);
    setRest(0);
    setExpandedBonus(false);
    setNotice("");
    setScreen("home");
  }

  function availableCoreIndices() {
    const disabled = sharedProgram.disabledExercises || [];
    return CORE_BREAKS.map((item, i) => i).filter(i => !disabled.includes(CORE_BREAKS[i][0]));
  }

  function startWorkout(id) {
    const coreOrderKey = "w" + week + "-" + id;
    const availableCore = availableCoreIndices();
    if (availableCore.length < 2) { setError("Keep at least two optional core exercises enabled."); return; }
    const existingCoreOrder = sharedProgram.coreOrder?.[coreOrderKey];
    if (!existingCoreOrder || existingCoreOrder.slice(0,2).some(i => !availableCore.includes(i))) {
      const coreOrder = { ...(sharedProgram.coreOrder || {}), [coreOrderKey]: seededShuffle(availableCore, "shared-core-" + week + "-" + id) };
      saveSharedProgram({ coreOrder });
    }
    const done = { ...(payload.done || {}) };
    Object.keys(done).filter(key => key.startsWith(`${id}-p`)).forEach(key => delete done[key]);
    save({ ...payload, done });
    setWildCardWorkout(null);
    setWorkoutId(id);
    setWorkoutDate(todayKey());
    setWorkoutTime(currentTimeKey());
    setCurrentWorkoutWeights({});
    setCurrentWorkoutSets({});
    setStartedAt(new Date().toISOString());
    setTrackerModal(Boolean(payload.trackerPrefs?.enabled ?? true));
    setExpandedBonus(false);
    setNotice("");
    setScreen("workout");
  }

  function startWildCardWorkout() {
    let generated;
    try { generated = generateWildCard(week, sharedProgram.disabledExercises || []); }
    catch (e) { setError(e.message); return; }
    const coreOrderKey = 'w' + week + '-E';
    const coreOrder = { ...(sharedProgram.coreOrder || {}), [coreOrderKey]: generated.coreOrder };
    const supersetOrder = { ...(sharedProgram.supersetOrder || {}), [coreOrderKey]: [0,1,2,3] };
    const done = { ...(payload.done || {}) };
    Object.keys(done).filter(key => key.startsWith("E-p")).forEach(key => delete done[key]);
    saveSharedProgram({ coreOrder, supersetOrder });
    save({ ...payload, done });
    setWildCardWorkout(generated);
    setWorkoutId("E");
    setWorkoutDate(todayKey());
    setWorkoutTime(currentTimeKey());
    setCurrentWorkoutWeights({});
    setCurrentWorkoutSets({});
    setStartedAt(new Date().toISOString());
    setTrackerModal(Boolean(payload.trackerPrefs?.enabled ?? true));
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
    // Completion is recorded at the actual moment the user finishes.
    const completedAt = new Date().toISOString();
    const sessions = [...(payload.sessions || []), {
      id: crypto.randomUUID(), workoutId, workoutName: activeWorkout.name, week, profile: person,
      startedAt: startedAt || completedAt, completedAt, workoutDate,
      bonusPerformed: activeWorkout.pairs[(sharedProgram.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3])[3]].every((_, exerciseIndex) => Boolean(payload.done?.[exerciseKey(workoutId, (sharedProgram.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3])[3], exerciseIndex)])),
      bonusDone: activeWorkout.pairs[(sharedProgram.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3])[3]].every((_, exerciseIndex) => Boolean(payload.done?.[exerciseKey(workoutId, (sharedProgram.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3])[3], exerciseIndex)])),
      coreSnapshot: (sharedProgram.coreOrder?.['w' + week + '-' + workoutId] || [0,1,2,3,4,5,6,7]).slice(0,2).map((coreIndex, displayIndex) => {
        const [name, prescription] = CORE_BREAKS[coreIndex];
        return { afterSuperset: displayIndex + 1, name, prescription, status: payload.coreStatus?.[`${startedAt}-${name}`] || "not recorded" };
      }),
      exerciseSnapshot: activeWorkout.pairs.map((pair, pairIndex) => pair.map(([name, detail], exerciseIndex) => ({ name, detail, weight: currentWorkoutWeights[name] || "", sets: currentWorkoutSets[name]?.enabled ? currentWorkoutSets[name].sets : null, completed: currentWorkoutSets[name]?.enabled ? currentWorkoutSets[name].sets.some(set => set.completed) : Boolean(payload.done?.[exerciseKey(workoutId, pairIndex, exerciseIndex)]) })))
    }];
    const setWeights = Object.fromEntries(Object.entries(currentWorkoutSets).filter(([,entry]) => entry.enabled).map(([name,entry]) => [name, [...entry.sets].reverse().find(set => set.completed && set.weight !== "")?.weight || currentWorkoutWeights[name] || ""]));
    const weights = { ...(payload.weights || {}), ...currentWorkoutWeights, ...setWeights };
    save({ ...payload, sessions, weights });
    localStorage.removeItem(draftKey(person));
    setStartedAt(null);
    setWildCardWorkout(null);
    setScreen("home");
    setNotice("");
  }

  function previousWeek() {
    if (week <= 1) return;
    if (startedAt) {
      setError("Finish or discard your in-progress workout before changing weeks.");
      return;
    }
    saveSharedProgram({ week: week - 1 });
    save({ ...payload, done: {}, coreDone: {} });
  }

  function nextWeek() {
    if (startedAt) {
      setError("Finish or discard your in-progress workout before changing weeks.");
      return;
    }
    const nextWeekNumber = week + 1;
    const supersetOrder = { ...(sharedProgram.supersetOrder || {}) };
    const coreOrder = { ...(sharedProgram.coreOrder || {}) };
    const weekAlreadyExists = PROGRAM.some(workout => supersetOrder['w' + nextWeekNumber + '-' + workout.id]);
    if (!weekAlreadyExists) {
      PROGRAM.forEach(workout => {
        supersetOrder['w' + nextWeekNumber + '-' + workout.id] = seededShuffle([0, 1, 2, 3], "shared-superset-" + nextWeekNumber + "-" + workout.id);
        coreOrder["w" + nextWeekNumber + "-" + workout.id] = seededShuffle(availableCoreIndices(), "shared-core-" + nextWeekNumber + "-" + workout.id);
      });
    }
    saveSharedProgram({ week: nextWeekNumber, supersetOrder, coreOrder });
    save({ ...payload, done: {}, coreDone: {} });
    setActiveModal(null);
  }


  async function copyStravaWorkout(session) {
    const text = stravaWorkoutText(session);
    if (!text) {
      setNotice("No completed exercises are available to export for this workout.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStravaCopiedId(session.id);
      setNotice("Workout copied. In Strava, edit the activity and use Text import under Exercises.");
      window.setTimeout(() => setStravaCopiedId(current => current === session.id ? null : current), 2200);
    } catch {
      setError("Couldn't access the clipboard. Try opening the app in your browser and copy again.");
    }
  }

  function openCompletedWorkout(session) {
    setViewSessionId(session.id);
    setEditingCompletedSession(false);
    setScreen("completed-workout");
  }

  function updateCompletedExercise(sessionId, pairIndex, exerciseIndex, patch) {
    const sessions = (payload.sessions || []).map(session => session.id !== sessionId ? session : {
      ...session,
      exerciseSnapshot: (session.exerciseSnapshot || []).map((pair, pi) => pi !== pairIndex ? pair : pair.map((item, ei) => ei !== exerciseIndex ? item : { ...item, ...patch }))
    });
    save({ ...payload, sessions });
  }

  function updateCompletedCore(sessionId, coreName, status) {
    const sessions = (payload.sessions || []).map(session => session.id !== sessionId ? session : {
      ...session,
      coreSnapshot: (session.coreSnapshot || []).map(item => item.name === coreName ? { ...item, status } : item)
    });
    save({ ...payload, sessions });
  }

  function updateCompletedWeight(sessionId, exerciseIndex, pairIndex, value) {
    const sessions = (payload.sessions || []).map(session => session.id !== sessionId ? session : {
      ...session,
      exerciseSnapshot: (session.exerciseSnapshot || []).map((pair, pi) => pi !== pairIndex ? pair : pair.map((item, ei) => ei !== exerciseIndex ? item : { ...item, weight: value }))
    });
    const weights = { ...(payload.weights || {}) };
    const session = sessions.find(item => item.id === sessionId);
    const item = session?.exerciseSnapshot?.[pairIndex]?.[exerciseIndex];
    if (item) weights[item.name] = value;
    save({ ...payload, sessions, weights });
  }

  function deleteWorkout(sessionId) {
    const session = (payload.sessions || []).find(item => item.id === sessionId);
    if (!session) return;
    const label = session.workoutName || PROGRAM.find(item => item.id === session.workoutId)?.name || (session.workoutId === "E" ? "Wild Card" : "this workout");
    setActiveModal({ eyebrow: "WORKOUT HISTORY", title: "Delete this workout?", description: "This will permanently remove " + label + " from your workout history. This action can't be undone.", confirmLabel: "Delete workout", destructive: true, onConfirm: () => {
      const sessions = (payload.sessions || []).filter(item => item.id !== sessionId);
      save({ ...payload, sessions });
    } });
  }

  function confirmModalAction() {
    const action = activeModal?.onConfirm;
    setActiveModal(null);
    action?.();
  }

  function updateWeight(name, value) {
    setCurrentWorkoutWeights(current => ({ ...current, [name]: value }));
    setCurrentWorkoutSets(current => current[name]?.enabled ? { ...current, [name]: { ...current[name], sets: current[name].sets.map(set => ({ ...set, weight: value })) } } : current);
  }

  function toggleSetTracking(name, detail) {
    setCurrentWorkoutSets(current => {
      if (current[name]?.enabled) return { ...current, [name]: { ...current[name], enabled: false } };
      const count = Number((detail.match(/(\d+)\s+sets?/i) || [])[1]) || 4;
      const initialWeight = currentWorkoutWeights[name] || lastUsedWeight(name) || "";
      return { ...current, [name]: { enabled: true, sets: Array.from({ length: Math.min(count, 12) }, () => ({ weight: initialWeight, completed: false })) } };
    });
  }
  function updateLiveSet(name, index, patch) {
    setCurrentWorkoutSets(current => {
      const entry = current[name];
      return entry?.enabled ? { ...current, [name]: { ...entry, sets: entry.sets.map((set, i) => i === index ? { ...set, ...patch } : set) } } : current;
    });
  }
  function saveTrackerPreference(name, enabled) {
    const trackerPrefs = { enabled, name: name.trim() || "Workout tracker" };
    save({ ...payload, trackerPrefs });
    setTrackerNameDraft(trackerPrefs.name);
  }
  function renderLiveExercise(name, detail) {
    const tracking = currentWorkoutSets[name];
    return <div className="exercise-row" key={name}>
      <div className="exercise-name"><strong>{name}</strong><small>{detail}</small><button className="set-tracking-toggle" onClick={() => toggleSetTracking(name, detail)}>{tracking?.enabled ? "Use one value for all sets" : "Adjust individual sets"}</button></div>
      <label className="weight-input"><input aria-label={name + " " + (exerciseMetric(name) === "lb" ? "weight in pounds" : exerciseMetric(name) === "sec" ? "duration in seconds" : "repetitions")} inputMode="decimal" placeholder="—" value={currentWorkoutWeights[name] || ""} onChange={e => updateWeight(name,e.target.value)}/><span>{exerciseMetric(name)}</span>{lastUsedWeight(name) !== "" && <small className="last-used-weight">Last used: {lastUsedWeight(name)} {exerciseMetric(name)}</small>}</label>
      {tracking?.enabled && <div className="set-tracking-panel">{tracking.sets.map((set,index) => <div className="set-tracking-row" key={index}><label><input type="checkbox" checked={set.completed} onChange={e => updateLiveSet(name,index,{completed:e.target.checked})}/><span>Set {index+1}</span></label><input aria-label={name + " set " + (index+1) + " " + exerciseMetric(name)} inputMode="decimal" placeholder={exerciseMetric(name) === "lb" ? "Weight" : exerciseMetric(name) === "sec" ? "Seconds" : "Reps"} value={set.weight} onChange={e => updateLiveSet(name,index,{weight:e.target.value})}/><span>{exerciseMetric(name)}</span></div>)}</div>}
      <ExerciseGuide name={name}/>
    </div>;
  }

  function lastUsedWeight(name) {
    const sessions = [...(payload.sessions || [])].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
    for (const session of sessions) {
      const exercise = session.exerciseSnapshot?.flat().find(item => item.name === name);
      if (!exercise) continue;
      if (Array.isArray(exercise.sets)) {
        const lastCompletedSet = [...exercise.sets].reverse().find(set => set.completed && set.weight !== "" && set.weight != null);
        if (lastCompletedSet) return lastCompletedSet.weight;
      }
      if (exercise.weight !== "" && exercise.weight != null) return exercise.weight;
    }
    return "";
  }

  const orderedWorkouts = PROGRAM;
  const filteredLibrary = EXERCISE_LIBRARY.filter(item => (libraryFilter === "All" || item.muscles.includes(libraryFilter)) && (librarySourceFilter === "All" || item.sources.includes(librarySourceFilter)) && (item.name.toLowerCase().includes(librarySearch.toLowerCase()) || item.muscles.join(" ").toLowerCase().includes(librarySearch.toLowerCase())));
  const disabledExercises = sharedProgram.disabledExercises || [];

  function toggleExerciseAvailability(name) {
    const isDisabled = disabledExercises.includes(name);
    const nextDisabled = isDisabled ? disabledExercises.filter(item => item !== name) : [...disabledExercises, name];
    const wildCardCategory = Object.entries(WILD_CARD_POOLS).find(([,pool]) => pool.some(([exercise]) => exercise === name));
    if (!isDisabled && wildCardCategory) {
      const remaining = wildCardCategory[1].filter(([exercise]) => !nextDisabled.includes(exercise));
      if (remaining.length < 2) { setLibraryMessage("Keep at least two enabled exercises in each Wild Card category."); return; }
    }
    if (!isDisabled && CORE_BREAKS.some(([exercise]) => exercise === name) && CORE_BREAKS.filter(([exercise]) => !nextDisabled.includes(exercise)).length < 2) {
      setLibraryMessage("Keep at least two optional core exercises enabled."); return;
    }
    setLibraryMessage("");
    saveSharedProgram({ disabledExercises: nextDisabled });
  }

  function enterTestProfile() {
    if (startedAt) { setError("Finish or discard your current workout before switching profiles."); return; }
    if (!localStorage.getItem(TEST_PROFILE_KEY)) localStorage.setItem(TEST_PROFILE_KEY, JSON.stringify(emptyPayload()));
    choosePerson("Test");
  }
  const wildCardCompleted = payload.sessions?.some(s => s.workoutId === "E" && s.week === week && s.completedAt);
  const now = new Date();
  const easternTime = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", hour: "numeric", minute: "2-digit", hour12: true }).format(now);
  const easternHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", hour: "2-digit", hourCycle: "h23" }).format(now));
  const timeGreeting = easternHour < 12 ? "Morning" : easternHour < 17 ? "Afternoon" : "Evening";

  if (!token) return <main className="app-shell auth-shell">
    <Brand />
    <section className="welcome-panel">
      <div className="eyebrow">A LITTLE WORK GOES A LONG WAY</div>
      <h2>Good {timeGreeting.toLowerCase()}.</h2>
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
    <div className="profile-options">{["Paul", "Chris"].map(name => <button className="profile-button" key={name} onClick={() => choosePerson(name)}>{name}<ArrowRight size={17} strokeWidth={2}/></button>)}</div>
    {error && <p className="error">{error}</p>}
  </section></main>;

  return <main className="app-shell">
    <header className="topbar"><Brand /><div className="header-actions"><button className="icon-button refresh-app-button" aria-label="Refresh app and check for updates" title="Refresh app and check for updates" onClick={forceRefreshApp}><RefreshCw size={15}/></button><button className="icon-button settings-top-button" aria-label="Settings" title="Settings" onClick={() => setScreen("settings")}><Settings size={18}/></button></div></header>
    {screen === "home" ? <>
      <section className="home-welcome">
        <div className="home-greeting-copy"><div className="eyebrow">LET'S GET AFTER IT</div><h2>{timeGreeting}, {person}.</h2><p>Week {week} · {easternTime} Eastern</p></div>
        <div className="home-header-tools"><span className="home-week-pill">WEEK {String(week).padStart(2,"0")}</span><button className="home-history-link" onClick={() => setScreen("history")}>History <ArrowRight size={15}/></button></div>
      </section>
      <section className={`home-progress-strip ${completedThisWeek >= 4 ? "goal-reached" : ""}`}>
        <div className="home-progress-copy"><strong>{completedThisWeek >= 4 ? "4 of 4 workouts complete" : `${completedThisWeek} of 4 workouts`}</strong><span>{completedThisWeek >= 4 ? "Goal hit · extra credit is yours" : `${4-completedThisWeek} to go this week`}</span></div>
        <div className="home-progress-segments" aria-label={`${completedThisWeek} of 4 workouts completed`}>{[0,1,2,3].map(i => <i key={i} className={i < Math.min(completedThisWeek,4) ? "filled" : ""}/>)}</div>
      </section>
      {startedAt && workoutId && <section className="home-resume-card">
        <div className="home-resume-kicker"><span className="home-live-dot"/> WORKOUT IN PROGRESS</div>
        <div className="home-resume-main"><div><strong>{activeWorkout?.name || "Your workout"}</strong><small>Week {week} · Saved on this device</small></div><button onClick={() => setScreen("workout")}>Resume <ArrowRight size={17}/></button></div>
        <button className="home-discard-link" onClick={discardWorkout}>Discard workout</button>
      </section>}
      <div className="home-section-heading"><div><div className="eyebrow">THE ROTATION</div><h3>Your workouts</h3></div><span>A – D</span></div>
      <section className={`home-workout-grid ${startedAt && workoutId ? "has-active-workout" : ""}`}>{orderedWorkouts.map(w => {
        const done = payload.sessions.find(s => s.workoutId === w.id && s.week === week);
        return <button className={`home-workout-tile ${done ? "is-complete" : ""}`} key={w.id} disabled={Boolean(startedAt)} onClick={() => done ? openCompletedWorkout(done) : startWorkout(w.id)}>
          <span className="home-tile-top"><b>{done ? <Check size={17}/> : w.id}</b><span>{done ? "DONE" : "WORKOUT"}</span></span>
          <strong>{w.name}</strong><small>{done ? "Completed · View details" : w.focus}</small>
          <span className="home-tile-arrow">{done ? <Check size={16}/> : <ArrowRight size={16}/>}</span>
        </button>;
      })}</section>
      <section className="home-wild-card">
        <span className="home-wild-icon">✦</span><div className="home-wild-copy"><strong>Wild Card</strong><small>Mix it up with a bonus full-body session</small></div>
        <button className={wildCardCompleted ? "is-complete" : ""} disabled={Boolean(startedAt)} onClick={startWildCardWorkout}>{wildCardCompleted ? "New session" : "Generate"} <ArrowRight size={15}/></button>
      </section>
      <div className="home-bottom-row">
        <button className="previous-week-button" onClick={previousWeek} disabled={week <= 1}>← Previous week</button>
        <button className="next-week-button" onClick={() => {
          const next = week + 1;
          const exists = (payload.sessions || []).some(session => session.week === next) || PROGRAM.some(workout => sharedProgram.supersetOrder?.['w' + next + '-' + workout.id]);
          if (exists) nextWeek(); else setActiveModal({ eyebrow: "MOVE FORWARD", title: "Start week " + (week + 1) + "?", description: "This resets the current workout checkmarks and shuffles the superset and core order for the new week. Your completed workout history and saved weights stay intact.", confirmLabel: "Start week " + (week + 1), onConfirm: nextWeek });
        }}><RotateCcw size={14}/> {((payload.sessions || []).some(session => session.week === week + 1) || PROGRAM.some(workout => sharedProgram.supersetOrder?.['w' + (week + 1) + '-' + workout.id])) ? `Week ${week+1}` : `Start week ${week+1}`}</button>
      </div>
      {busy && <p className="home-syncing">Syncing…</p>}
    </> : screen === "settings" ? <>
      <button className="back-button" onClick={() => setScreen("home")}>← Back to workouts</button>
      <section className="greeting"><div><div className="eyebrow">PREFERENCES & REFERENCES</div><h2>Settings</h2><p>Tools and information for your training plan.</p></div></section>
      <button className="settings-library-card" onClick={() => setScreen("library")}><span className="settings-library-icon"><Library size={22}/></span><span><strong>Exercise Library</strong><small>{EXERCISE_LIBRARY.length} exercises · browse by muscle group, workout and training type</small></span><ArrowRight size={19}/></button>
      <div className="settings-note">The library brings together regular workouts, bonus movements, Wild Card options and optional core exercises.</div>
      <div className="settings-section-label">WORKOUT TRACKER REMINDER</div>
      <div className="tracker-preference-card">
        <label className="tracker-preference-toggle"><input type="checkbox" checked={payload.trackerPrefs?.enabled ?? true} onChange={e => saveTrackerPreference(trackerNameDraft || payload.trackerPrefs?.name || (person === "Paul" ? "Garmin watch" : "Workout tracker"),e.target.checked)}/><span><strong>Remind me to start my tracker</strong><small>Show a reminder when I start a new workout.</small></span></label>
        <label className="tracker-name-field">What do you use to track workouts?<input value={trackerNameDraft || payload.trackerPrefs?.name || (person === "Paul" ? "Garmin watch" : "Workout tracker")} onChange={e => setTrackerNameDraft(e.target.value)} onBlur={() => saveTrackerPreference(trackerNameDraft || "Workout tracker",payload.trackerPrefs?.enabled ?? true)} placeholder="e.g. Garmin watch"/></label>
      </div>
      <div className="settings-section-label">APP & PROFILE</div>
      <button className="settings-action-card" onClick={() => choosePerson(person === "Test" ? "Paul" : person === "Paul" ? "Chris" : "Paul")}><span className="settings-action-icon"><RefreshCw size={19}/></span><span><strong>Switch profile</strong><small>Currently using {person} · switch to {person === "Test" ? "Paul" : person === "Paul" ? "Chris" : "Paul"}</small></span><ArrowRight size={19}/></button>
      <button className="settings-action-card" onClick={enterTestProfile}><span className="settings-action-icon"><Dumbbell size={19}/></span><span><strong>{person === "Test" ? "Test profile active" : "Open test profile"}</strong><small>Separate local-only workouts, weights and history · only on this device</small></span><ArrowRight size={19}/></button>
      <button className="settings-action-card" onClick={logout}><span className="settings-action-icon"><Lock size={19}/></span><span><strong>Lock app</strong><small>Sign out and return to the unlock screen</small></span><ArrowRight size={19}/></button>
    </> : screen === "library" ? <>
      <button className="back-button" onClick={() => setScreen("settings")}>← Back to settings</button>
      <section className="greeting"><div><div className="eyebrow">OUR SHARED EXERCISE POOL</div><h2>Exercise Library</h2><p>{EXERCISE_LIBRARY.length} exercises across your training plan.</p></div></section>
      <input className="library-search" aria-label="Search exercises" placeholder="Search exercises or muscle groups…" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}/>
      <div className="library-filter-group"><span className="library-filter-label">FILTER BY MUSCLE</span><div className="library-filters">{LIBRARY_FILTERS.map(filter => <button key={filter} className={libraryFilter === filter ? "selected" : ""} onClick={() => setLibraryFilter(filter)}>{filter}</button>)}</div></div>
      <div className="library-filter-group"><span className="library-filter-label">FILTER BY PROGRAM / TYPE</span><div className="library-filters source-filters">{LIBRARY_SOURCE_FILTERS.map(filter => <button key={filter} className={librarySourceFilter === filter ? "selected" : ""} onClick={() => setLibrarySourceFilter(filter)}>{filter}</button>)}</div></div>
      <section className="library-list">{filteredLibrary.map(item => <article className="library-item" key={item.name}>
        <div className="library-item-heading"><div><strong>{item.name}</strong><small>{item.muscles.join(" · ")}</small></div><span>{item.sources.includes("Wild Card") ? "Wild Card" : item.sources.includes("Bonus") ? "Bonus" : "Program"}</span></div>
        <div className="library-item-meta"><span>{item.sources.join(" · ")}</span><span>{item.prescriptions.join(" / ")}</span></div>
        <div className="library-item-controls"><span className={disabledExercises.includes(item.name) ? "rotation-status is-disabled" : "rotation-status"}>{disabledExercises.includes(item.name) ? "Excluded from random rotation" : "In rotation"}</span><button className="rotation-toggle" onClick={() => toggleExerciseAvailability(item.name)}>{disabledExercises.includes(item.name) ? "Re-enable" : "Exclude from rotation"}</button></div>
        {item.sources.some(source => ["Upper Body 1","Lower Body","Upper Body 2","Full Body + Core","Bonus"].includes(source)) && <small className="fixed-program-note">This exercise is also assigned in a fixed A–D workout; this setting does not remove that required assignment.</small>}
        <ExerciseGuide name={item.name}/>
      </article>)}{!filteredLibrary.length && <p className="history-empty">No exercises match that search.</p>}</section>
      {libraryMessage && <p className="error">{libraryMessage}</p>}
      <p className="library-footnote">Excluded exercises are skipped by future Wild Card and optional-core selections. Fixed A–D assignments remain unchanged; completed history and saved weights are preserved.</p>
    </> : screen === "history" ? <>
      <button className="back-button" onClick={() => setScreen("home")}>← Back to workouts</button>
      <section className="greeting"><div><div className="eyebrow">YOUR TRAINING LOG</div><h2>Workout history</h2><p>{payload.sessions?.length || 0} completed workouts</p></div></section>
      <section className="history-list">
        {[...(payload.sessions || [])].sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt)).map(session => {
          const workout = PROGRAM.find(w => w.id === session.workoutId) || (session.workoutId === "E" ? { name: "Wild Card" } : null);
          const recordedWeights = (session.exerciseSnapshot || []).flat().filter(item => (Array.isArray(item.sets) && item.sets.some(set => set.completed && set.weight !== "" && set.weight != null)) || (item.weight !== "" && item.weight != null));
          const exerciseCount = (session.exerciseSnapshot || []).flat().length;
          const duration = session.startedAt && session.completedAt ? Math.max(1, Math.round((new Date(session.completedAt) - new Date(session.startedAt)) / 60000)) : null;
          return <article className="history-card" key={session.id}>
            <div className="history-card-head"><div className="history-title-group"><span className="history-workout-mark">{session.workoutId}</span><div><span className="eyebrow">WEEK {session.week || "—"}</span><h3>{session.workoutName || workout?.name || `Workout ${session.workoutId}`}</h3></div></div><time>{session.completedAt ? new Date(session.completedAt).toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"}) : "Date unavailable"}</time></div>
            <div className="history-meta"><span>{session.completedAt ? "Finished " + new Date(session.completedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}) : "Completion time unavailable"}</span>{duration && <span>{duration} min</span>}<span>{exerciseCount} exercises</span></div>
            <details className="history-weights">
              <summary><span>Recorded values</span><span>{recordedWeights.length ? `${recordedWeights.length} logged` : "None logged"}</span></summary>
              {recordedWeights.length ? recordedWeights.map(item => <div className="history-exercise-group" key={item.name}>
                <div className="history-exercise-row"><span>{item.name}</span><strong>{Array.isArray(item.sets) && item.sets.some(set => set.completed) ? "Set breakdown" : item.weight !== "" ? item.weight + " " + exerciseMetric(item.name) : "—"}</strong></div>
                {Array.isArray(item.sets) && item.sets.some(set => set.completed) && <div className="history-set-breakdown">{item.sets.map((set,index) => set.completed ? <div className="history-set-row" key={index}><span>Set {index+1}</span><strong>{set.weight !== "" && set.weight != null ? set.weight + " " + exerciseMetric(item.name) : "Not recorded"}</strong></div> : null)}</div>}
              </div>) : <p className="history-no-weights">No values were recorded for this session.</p>}
            </details>
            <button className="history-edit-workout" onClick={() => openCompletedWorkout(session)}><Dumbbell size={15}/> Edit workout</button>
            <button className="history-strava-export" onClick={() => copyStravaWorkout(session)}><ExternalLink size={15}/>{stravaCopiedId === session.id ? "Copied!" : "Copy for Strava"}</button>
            <button className="history-delete" onClick={() => deleteWorkout(session.id)}>Delete workout</button>
          </article>;
        })}
        {!payload.sessions?.length && <p className="history-empty">Your completed workouts will show up here.</p>}
      </section>
    </> : screen === "completed-workout" && viewedSession ? <>
      <button className="back-button" onClick={() => { setEditingCompletedSession(false); setViewSessionId(null); setScreen("home"); }}>← Back to week {viewedSession.week}</button>
      <section className="greeting workout-heading"><div><div className="eyebrow">COMPLETED WORKOUT · WEEK {viewedSession.week}</div><h2>{viewedSession.workoutName || PROGRAM.find(w => w.id === viewedSession.workoutId)?.name || "Workout"}</h2><p>Completed {new Date(viewedSession.completedAt).toLocaleDateString([], {month:"long",day:"numeric",year:"numeric"})} · {new Date(viewedSession.completedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</p></div></section>
      <div className="completed-session-toolbar"><span className="muted-label">{editingCompletedSession ? "Editing exercises, completion & weights" : "Read-only workout record"}</span><button className="rotation-toggle" onClick={() => setEditingCompletedSession(value => !value)}>{editingCompletedSession ? "Done editing" : "Edit workout"}</button></div>
      <button className="history-strava-export completed-strava-export" onClick={() => copyStravaWorkout(viewedSession)}><ExternalLink size={16}/>{stravaCopiedId === viewedSession.id ? "Copied!" : "Copy for Strava"}</button>
      <section className="superset-list">{(viewedSession.exerciseSnapshot || []).map((pair, pairIndex) => <article className="superset-card" key={pairIndex}><header><div className="superset-heading-copy"><span className="eyebrow">SUPERSET {pairIndex + 1}{pairIndex === 3 ? " · BONUS" : ""}</span><span className="pair-progress-label">{pair.every(item => item.completed) ? "Pair complete" : "Recorded"}</span></div></header>{pair.map((item, exerciseIndex) => <div className="exercise-row" key={item.name}><div className="exercise-name"><strong>{item.name}</strong><small>{item.detail}</small>{editingCompletedSession && <button className={`completed-exercise-toggle ${item.completed ? "is-complete" : ""}`} onClick={() => updateCompletedExercise(viewedSession.id, pairIndex, exerciseIndex, { completed: !item.completed })}>{item.completed ? <><Check size={13}/> Completed</> : "Mark completed"}</button>}</div><label className="weight-input">{editingCompletedSession ? <input aria-label={item.name + " recorded " + exerciseMetric(item.name)} inputMode="decimal" placeholder="—" value={item.weight || ""} onChange={e => updateCompletedWeight(viewedSession.id, exerciseIndex, pairIndex, e.target.value)}/> : <strong>{item.weight || "—"}</strong>}<span>{exerciseMetric(item.name)}</span></label><ExerciseGuide name={item.name}/></div>)}</article>)}</section>
      {viewedSession.coreSnapshot?.length > 0 && <section className="core-break"><div className="core-break-copy"><span className="eyebrow">OPTIONAL CORE</span>{viewedSession.coreSnapshot.map(core => <p key={core.name}><strong>{core.name}</strong><small>{core.prescription} · {core.status}</small>{editingCompletedSession && <span className="completed-core-actions"><button className={core.status === "done" ? "selected" : ""} onClick={() => updateCompletedCore(viewedSession.id, core.name, "done")}>Done</button><button className={core.status === "skipped" ? "selected" : ""} onClick={() => updateCompletedCore(viewedSession.id, core.name, "skipped")}>Skip</button></span>}</p>)}</div></section>}
    </> : activeWorkout && <>
      <button className="back-button" onClick={() => setScreen("home")}>← All workouts</button>
      <section className="greeting workout-heading"><div><div className="eyebrow">WORKOUT {activeWorkout.id} · WEEK {week}</div><h2>{activeWorkout.name}</h2><p>{activeWorkout.focus}</p></div></section>
      {notice && <div className="warning-banner" role="alert"><Clock3 size={20}/><strong>{notice}</strong><button aria-label="Dismiss warning" onClick={() => setNotice("")}>×</button></div>}
      <section className="live-progress-card" aria-label="Workout progress">
        <div className="live-progress-top"><div><span className="eyebrow">YOUR PROGRESS</span><strong>{completedRequiredExercises} <span>/ {totalRequiredExercises}</span></strong></div><span className="live-progress-status">{completedRequiredExercises === totalRequiredExercises ? "Required work complete" : completedRequiredExercises === 0 ? "Ready when you are" : "Keep it moving"}</span></div>
        <div className="live-progress-track"><i style={{ width: `${totalRequiredExercises ? completedRequiredExercises / totalRequiredExercises * 100 : 0}%` }} /></div>
        <div className="live-progress-bottom"><span>{Math.round(totalRequiredExercises ? completedRequiredExercises / totalRequiredExercises * 100 : 0)}% required work</span><span>Bonus: {completedBonusExercises}/2</span></div>
      </section>
      <div className="workout-controls"><span className="muted-label workout-requirement">3 required supersets · 1 optional bonus</span><div className="workout-datetime"><div className="datetime-field"><span className="datetime-label">Workout date</span><input aria-label="Workout date" type="date" value={workoutDate} max={todayKey()} onChange={e => setWorkoutDate(e.target.value)} /></div><div className="datetime-field"><span className="datetime-label">Finish time</span><strong className="live-finish-time">{easternTime} Eastern</strong></div></div><span className="muted-label workout-started">Started {new Date(startedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span></div>
      <section className="superset-list">{(sharedProgram.supersetOrder?.['w' + week + '-' + workoutId] || [0,1,2,3]).slice(0,3).map((pairIndex,displayIndex) => {
        const pair = activeWorkout.pairs[pairIndex];
        const index = pairIndex;
        const complete = pair.every((_, ei) => payload.done?.[exerciseKey(workoutId,index,ei)]);
        const coreIndex = (sharedProgram.coreOrder?.['w' + week + '-' + workoutId] || [0,1,2,3,4,5,6,7])[displayIndex];
        const core = CORE_BREAKS[coreIndex];
        return <div className="superset-and-core" key={index}>
        <article className={`superset-card ${complete ? "pair-complete" : ""}`}>
          <header><div className="superset-heading-copy"><span className="eyebrow">SUPERSET {displayIndex+1}</span><span className="pair-progress-label">{complete ? "Pair complete" : "Pair not complete"}</span></div><button className={`pair-check ${complete ? "checked" : ""}`} onClick={() => togglePair(index)}>{complete ? <><Check size={17}/> Done</> : "Complete pair"}</button></header>
          {pair.map(([name,detail]) => renderLiveExercise(name,detail))}
          <button className="rest-button" onClick={() => setRest(60)}><Timer size={14}/> Rest 60 sec</button>
        </article>
        {displayIndex < 2 && <div className={`core-break ${payload.coreStatus?.[`${startedAt}-${core[0]}`] === "done" ? "core-done" : ""}`}>
          <div className="core-break-copy"><span className="eyebrow">OPTIONAL CORE · BETWEEN SETS</span><strong>{core[0]}</strong><small>{core[1]} · {core[2]}</small></div>
          <div className="core-actions">
            <button className={`core-action ${payload.coreStatus?.[`${startedAt}-${core[0]}`] === "done" ? "selected" : ""}`} onClick={() => setCoreStatus(core[0], "done")}><Check size={13}/> Done</button>
            <button className={`core-action ${payload.coreStatus?.[`${startedAt}-${core[0]}`] === "skipped" ? "selected" : ""}`} onClick={() => setCoreStatus(core[0], "skipped")}>Skip</button>
          </div>
          <ExerciseGuide name={core[0]}/>
        </div>}
        </div>;
      })}</section>
      <section className={`bonus-card ${expandedBonus ? "bonus-open" : ""}`}>
        <button className="bonus-toggle" onClick={() => {setExpandedBonus(v => !v);}}><div><div className="eyebrow">OPTIONAL BONUS ROUND</div><strong>Superset 4 · Feeling saucy?</strong><small>Extra credit. Not required to finish.</small></div><span>{expandedBonus ? <ChevronUp/> : <ChevronDown/>}</span></button>
        {expandedBonus && (() => { const bonusIndex = bonusPairIndex; const bonusComplete = activeWorkout.pairs[bonusIndex].every((_,ei) => payload.done?.[exerciseKey(workoutId,bonusIndex,ei)]); return <div className="bonus-content">{activeWorkout.pairs[bonusIndex].map(([name,detail]) => renderLiveExercise(name,detail))}<button className={`pair-check bonus-done ${bonusComplete ? "checked" : ""}`} onClick={() => togglePair(bonusIndex)}>{bonusComplete ? "Bonus complete · Undo" : "Mark bonus complete"}</button></div>; })()}
      </section>
      {rest > 0 && <div className="rest-overlay"><div><div className="eyebrow">REST TIMER</div><strong>{Math.floor(rest/60)}:{String(rest%60).padStart(2,"0")}</strong><button onClick={() => setRest(0)}>Skip rest</button></div></div>}
      <button className="primary-button complete-button" onClick={completeWorkout}> <Check size={18}/> Complete workout</button>
      <p className="small-note centered">You can finish after three supersets. Bonus work is always optional.</p>
    </>}
    {trackerModal && <div className="modal-backdrop tracker-modal-backdrop" role="presentation" onClick={() => setTrackerModal(false)}>
      <section className="confirm-modal tracker-modal" role="dialog" aria-modal="true" aria-labelledby="tracker-modal-title" onClick={e => e.stopPropagation()}>
        <div className="tracker-modal-icon"><Dumbbell size={24}/></div><div className="eyebrow">BEFORE YOU BEGIN</div><h3 id="tracker-modal-title">Ready to get after it?</h3>
        <p>Remember to start your {payload.trackerPrefs?.name || (person === "Paul" ? "Garmin watch" : "workout tracker")} so your activity is captured.</p>
        <div className="modal-actions"><button className="modal-cancel" onClick={() => setTrackerModal(false)}>Skip reminder</button><button className="modal-confirm" onClick={() => setTrackerModal(false)}>Let's go</button></div>
      </section>
    </div>}
    {activeModal && <div className="modal-backdrop" role="presentation" onClick={() => setActiveModal(null)}>
      <section className={`confirm-modal ${activeModal.destructive ? "confirm-modal-destructive" : ""}`} role="dialog" aria-modal="true" aria-labelledby="app-modal-title" aria-describedby="app-modal-description" onClick={e => e.stopPropagation()}>
        <div className="eyebrow">{activeModal.eyebrow}</div>
        <h3 id="app-modal-title">{activeModal.title}</h3>
        <p id="app-modal-description">{activeModal.description}</p>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className={`modal-confirm ${activeModal.destructive ? "modal-confirm-destructive" : ""}`} onClick={confirmModalAction}>{activeModal.confirmLabel}</button>
        </div>
      </section>
    </div>}
    {error && <p className="error">{error}</p>}
  </main>;
}

function Brand() {
  return <div className="brand-lockup"><div className="brand-mark"><Dumbbell size={19}/></div><div><div className="eyebrow">YOUR SHARED TRAINING PLAN</div><h1>Our Gym Plan<span>.</span></h1></div></div>;
}