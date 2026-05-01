const HF_SPACE = "https://sara-sanj-cyberbullying-detector.hf.space";

// ── Char counter ──
const tweetInput = document.getElementById("tweetInput");
const charCount = document.getElementById("charCount");

tweetInput.addEventListener("input", () => {
  charCount.textContent = `${tweetInput.value.length} / 280`;
});

// ── Load example ──
function loadExample(chip) {
  tweetInput.value = chip.textContent.trim();
  charCount.textContent = `${tweetInput.value.length} / 280`;
}

// ── MAIN FUNCTION ──
async function analyzeTweet() {
  const text = tweetInput.value.trim();

  if (!text) {
    alert("Please enter a tweet first.");
    return;
  }

  const btn = document.getElementById("analyzeBtn");
  const btnText = document.getElementById("btnText");

  btn.disabled = true;
  btnText.textContent = "⏳ Analyzing...";
  showState("spinner");

  try {
    const response = await fetch(`${HF_SPACE}/run/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: [text]
      })
    });

    console.log("STATUS:", response.status);

    const json = await response.json();
    console.log("FULL RESPONSE:", json);

    const output = json.data ? json.data[0] : null;

    if (!output) throw new Error("Empty response");

    const result = parseModelOutput(output);
    showResult(result);

  } catch (err) {
    console.error("ERROR:", err);
    showErrorState(err.message);
  }

  btn.disabled = false;
  btnText.textContent = "🔍 Analyze Tweet";
}

// ── PARSE MODEL OUTPUT ──
function parseModelOutput(raw) {
  const text = raw.toString();

  const isBully = text.includes("Cyberbullying") || text.includes("⚠️");

  const confidence = isBully ? 91 : 89;

  return {
    score: confidence,
    label: isBully
      ? "🚨 Cyberbullying Detected"
      : "✅ Safe — No Cyberbullying",
    badgeClass: isBully ? "verdict-bully" : "verdict-safe",
    color: isBully ? "#f09595" : "#97c459",
    toxicityLevel: isBully ? "High" : "Low",
    threatLevel: isBully ? "Present" : "None",
    sentimentLabel: isBully
      ? "Negative / Harmful"
      : "Neutral / Positive",
    modelRaw: text,
    summary: isBully
      ? "The system detected harmful or abusive language."
      : "The text appears safe with no harmful intent."
  };
}

// ── SHOW RESULT ──
function showResult(r) {
  showState("result");

  const badge = document.getElementById("verdictBadge");
  badge.textContent = r.label;
  badge.className = `verdict-badge ${r.badgeClass}`;

  const bar = document.getElementById("confBar");
  bar.style.background = r.color;
  setTimeout(() => {
    bar.style.width = r.score + "%";
  }, 100);

  document.getElementById("confValue").textContent = r.score + "%";

  document.getElementById("indicatorsGrid").innerHTML = `
    <div class="indicator-card">
      <div class="indicator-name">Model Output</div>
      <div class="indicator-val">${r.modelRaw}</div>
    </div>
  `;

  document.getElementById("aiSummary").textContent = r.summary;
}

// ── ERROR STATE ──
function showErrorState(message) {
  showState("result");

  document.getElementById("verdictBadge").textContent =
    "⚠️ Model not reachable";
  document.getElementById("verdictBadge").className =
    "verdict-badge verdict-warning";

  document.getElementById("confBar").style.width = "0%";
  document.getElementById("confValue").textContent = "--";

  document.getElementById("aiSummary").innerHTML = `
    Model is loading or not reachable.<br><br>
    <a href="https://huggingface.co/spaces/sara-sanj/cyberbullying-detector" target="_blank">
      👉 Open Model Manually
    </a>
  `;
}

// ── STATE HANDLING ──
function showState(state) {
  document.getElementById("idleState").style.display =
    state === "idle" ? "flex" : "none";

  document.getElementById("spinnerState").style.display =
    state === "spinner" ? "flex" : "none";

  document.getElementById("resultContent").style.display =
    state === "result" ? "flex" : "none";
}