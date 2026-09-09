const ERGAST = "https://api.jolpi.ca/ergast/f1";
const MODEL = "gemini-3.6-flash";
const fs = await import("node:fs/promises");

const get = async (p) => {
  const r = await fetch(ERGAST + p);
  if (!r.ok) throw new Error(`jolpica ${r.status}`);
  return r.json();
};

const last = await get("/current/last/results.json");
const race = last.MRData.RaceTable.Races[0];
if (!race) { console.log("No race data."); process.exit(0); }

const key = `${race.season}-${race.round}`;
try {
  await fs.access(`briefs/${key}.json`);
  console.log(`${key} already written. Nothing to do.`);
  process.exit(0);
} catch {}

const st = await get(`/${race.season}/${race.round}/driverStandings.json`);
const table = st.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];

const top = race.Results.slice(0, 10).map(r =>
  `P${r.positionText} ${r.Driver.givenName} ${r.Driver.familyName} (${r.Constructor.name}) — started P${r.grid}, ${r.Time?.time || r.status}`
).join("\n");
const dnf = race.Results.filter(r => !parseInt(r.positionText, 10))
  .map(r => `${r.Driver.familyName}: ${r.status}`).join("; ");
const champ = table.slice(0, 6)
  .map(s => `${s.position}. ${s.Driver.familyName} ${s.points}`).join(" | ");

const prompt = `You are writing for a public Formula 1 archive, for readers newer to the sport who want real analysis rather than filler. Be specific and plain-spoken. No clichés, no hype.

${race.raceName}, ${race.season}, round ${race.round}
${race.Circuit.circuitName}, ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}
Date: ${race.date}

Classification:
${top}

Retirements: ${dnf || "none recorded"}
Championship after this round: ${champ || "not recorded"}

Search for what actually happened — strategy, incidents, penalties, weather, tyres.

Respond ONLY with a JSON object, no preamble and no markdown fences:
{"headline":"one vivid sentence naming the story of this race","whatHappened":"3-4 sentences on how the race unfolded","keyBattle":"2-3 sentences on the most important fight or strategic call","championshipImpact":"2-3 sentences on what it meant for the title","watchThis":"one specific thing a newer fan should notice, 2 sentences"}`;

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
  { method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }) });

const data = await res.json();
if (data.error) throw new Error(data.error.message);

const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
const clean = text.replace(/```json|```/g, "").trim();
const brief = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));

brief.season = race.season;
brief.round = race.round;
brief.raceName = race.raceName;
brief.generatedAt = new Date().toISOString();

await fs.mkdir("briefs", { recursive: true });
await fs.writeFile(`briefs/${key}.json`, JSON.stringify(brief, null, 2));
console.log(`Wrote briefs/${key}.json — ${brief.headline}`);
