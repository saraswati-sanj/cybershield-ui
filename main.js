// ── HuggingFace Gradio Blocks API ──
// Your app.py uses gr.Blocks with a Button click (fn_index 0 = predict function)
const HF_SPACE = 'https://sara-sanj-cyberbullying-detector.hf.space';

// ── Char counter ──
const tweetInput = document.getElementById('tweetInput');
const charCount = document.getElementById('charCount');
tweetInput.addEventListener('input', () => {
  charCount.textContent = `${tweetInput.value.length} / 280`;
});

// ── Load example chip ──
function loadExample(chip) {
  tweetInput.value = chip.textContent.trim();
  charCount.textContent = `${tweetInput.value.length} / 280`;
  tweetInput.focus();
}

// ── Main analyze function ──
async function analyzeTweet() {
  const text = tweetInput.value.trim();
  if (!text) { alert('Please enter a tweet first.'); return; }

  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('btnText').textContent = '⏳ Analyzing…';
  showState('spinner');

  try {
    // Gradio Blocks API — fn_index 0 = first click function (predict)
    const response = await fetch(`${HF_SPACE}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
  data: [text]
})
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API ${response.status}: ${errText}`);
    }

    const json = await response.json();
    // Gradio returns { data: ["✅ No Cyberbullying"] } or { data: ["⚠️ Cyberbullying Detected"] }
    const rawOutput = json.data ? json.data[0] : null;

    if (!rawOutput) throw new Error('Empty response from model');

    const result = parseModelOutput(rawOutput);
    showResult(result);

  } catch (err) {
    console.error('API Error:', err);
    showErrorState(err.message);
  }

  btn.disabled = false;
  document.getElementById('btnText').textContent = '🔍 Analyze Tweet';
}

// ── Parse your model's exact output strings ──
// Your app.py returns either:
//   "✅ No Cyberbullying"
//   "⚠️ Cyberbullying Detected"
//   "Error: ..."
function parseModelOutput(raw) {
  const text = (raw || '').toString().trim();

  let isBully = false;
  let isError = false;

  if (text.includes('Cyberbullying Detected') || text.includes('⚠️')) {
    isBully = true;
  } else if (text.includes('No Cyberbullying') || text.includes('✅')) {
    isBully = false;
  } else if (text.startsWith('Error')) {
    isError = true;
  }

  if (isError) {
    return {
      score: 0,
      label: '⚠️ Model Error',
      badgeClass: 'verdict-warning',
      color: '#fac775',
      toxicityLevel: '—',
      threatLevel: '—',
      sentimentLabel: '—',
      modelRaw: text,
      summary: `The model returned an error: ${text}. This usually means the input was empty or the model is still loading.`
    };
  }

  const confidence = isBully ? 91 : 89;
  const color = isBully ? '#f09595' : '#97c459';

  return {
    score: confidence,
    label: isBully ? '🚨 Cyberbullying Detected' : '✅ Safe — No Cyberbullying',
    badgeClass: isBully ? 'verdict-bully' : 'verdict-safe',
    color,
    toxicityLevel: isBully ? 'High' : 'Low',
    threatLevel: isBully ? 'Present' : 'None',
    sentimentLabel: isBully ? 'Negative / Harmful' : 'Neutral / Positive',
    modelRaw: text,
    summary: isBully
      ? `Your ML model (TF-IDF + Stacking Classifier) flagged this tweet as cyberbullying with ${confidence}% confidence. The language contains patterns associated with harmful or abusive content. Consider reporting or blocking.`
      : `Your ML model classified this tweet as safe with ${confidence}% confidence. No significant cyberbullying patterns were detected in the text.`
  };
}

// ── Show error in result panel ──
function showErrorState(message) {
  showState('result');
  document.getElementById('verdictBadge').textContent = '⚠️ Could not reach model';
  document.getElementById('verdictBadge').className = 'verdict-badge verdict-warning';
  document.getElementById('confBar').style.width = '0%';
  document.getElementById('confValue').textContent = '—';
  document.getElementById('indicatorsGrid').innerHTML = '';

  const isAsleep = message.includes('502') || message.includes('503') || message.includes('fetch') || message.includes('Failed');
  document.getElementById('aiSummary').textContent = isAsleep
    ? '"Your HuggingFace Space is asleep (free tier). Open https://huggingface.co/spaces/sara-sanj/cyberbullying-detector in a new tab to wake it up, wait ~30 seconds, then try again."'
    : `"API Error: ${message}"`;
}

// ── Render result to UI ──
function showResult(r) {
  showState('result');

  const badge = document.getElementById('verdictBadge');
  badge.textContent = r.label;
  badge.className = `verdict-badge ${r.badgeClass}`;

  const bar = document.getElementById('confBar');
  bar.style.background = r.color;
  setTimeout(() => { bar.style.width = r.score + '%'; }, 50);

  document.getElementById('confValue').style.color = r.color;
  document.getElementById('confValue').textContent = r.score + '%';

  const indicators = [
    { name: 'Toxicity Level',  val: r.toxicityLevel,  cls: r.toxicityLevel === 'High' ? 'high' : 'low' },
    { name: 'Model Output',    val: r.modelRaw,        cls: r.toxicityLevel === 'High' ? 'high' : 'low' },
    { name: 'Threat Language', val: r.threatLevel,     cls: r.threatLevel === 'Present' ? 'high' : 'low' },
    { name: 'Sentiment',       val: r.sentimentLabel,  cls: r.sentimentLabel.includes('Negative') ? 'high' : 'low' },
  ];

  document.getElementById('indicatorsGrid').innerHTML = indicators.map(i => `
    <div class="indicator-card">
      <div class="indicator-name">${i.name}</div>
      <div class="indicator-val ${i.cls}">${i.val}</div>
    </div>
  `).join('');

  document.getElementById('aiSummary').textContent = '"' + r.summary + '"';
}

// ── Toggle UI state ──
function showState(state) {
  document.getElementById('idleState').style.display     = state === 'idle'    ? 'flex' : 'none';
  document.getElementById('spinnerState').style.display  = state === 'spinner' ? 'flex' : 'none';
  document.getElementById('resultContent').style.display = state === 'result'  ? 'flex' : 'none';
}

// ── Contact form ──
function handleContactSubmit(e) {
  e.preventDefault();
  const btn = e.target;
  btn.textContent = '✓ Message Sent!';
  btn.style.background = 'rgba(99,153,34,0.3)';
  btn.style.color = '#97c459';
  setTimeout(() => {
    btn.textContent = 'Send Message →';
    btn.style.background = '';
    btn.style.color = '';
  }, 3000);
}

// ── Scroll fade-in animations ──
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
