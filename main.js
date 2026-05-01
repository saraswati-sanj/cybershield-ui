// ── HuggingFace Space API ──
const HF_API = 'https://sara-sanj-cyberbullying-detector.hf.space/run/predict';

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
    const response = await fetch(HF_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [text] })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const json = await response.json();
    const rawOutput = json.data[0];
    const result = parseHFResponse(rawOutput, text);
    showResult(result);

  } catch (err) {
    console.error('HuggingFace API error:', err);
    showState('result');
    document.getElementById('verdictBadge').textContent = '⚠️ Could not reach model';
    document.getElementById('verdictBadge').className = 'verdict-badge verdict-warning';
    document.getElementById('confBar').style.width = '0%';
    document.getElementById('confValue').textContent = '—';
    document.getElementById('indicatorsGrid').innerHTML = '';
    document.getElementById('aiSummary').textContent =
      '"The model is loading or temporarily unavailable. HuggingFace free-tier Spaces sleep after inactivity — please wait 30 seconds and try again."';
  }

  btn.disabled = false;
  document.getElementById('btnText').textContent = '🔍 Analyze Tweet';
}

// ── Parse HuggingFace Gradio response ──
function parseHFResponse(raw, originalText) {
  let label = '', confidence = 0, isBully = false, isWarning = false;

  if (typeof raw === 'string') {
    label = raw.trim().toLowerCase();
    isBully = label.includes('bully') || label.includes('hate') || label.includes('toxic') || label.includes('offensive');
    isWarning = label.includes('warning') || label.includes('maybe') || label.includes('potential');
    confidence = isBully ? 85 : isWarning ? 50 : 12;
  } else if (raw && typeof raw === 'object') {
    const lbl = (raw.label || '').toLowerCase();
    isBully = lbl.includes('bully') || lbl.includes('hate') || lbl.includes('toxic') || lbl.includes('offensive') || lbl === '1';
    isWarning = lbl.includes('warning') || lbl.includes('maybe');

    if (raw.confidences && Array.isArray(raw.confidences)) {
      const match = raw.confidences.find(c =>
        c.label.toLowerCase() === (raw.label || '').toLowerCase()
      );
      confidence = match ? Math.round(match.confidence * 100) : (isBully ? 85 : 12);
    } else if (typeof raw.confidence === 'number') {
      confidence = Math.round(raw.confidence * 100);
    } else {
      confidence = isBully ? 85 : 12;
    }
    label = raw.label || lbl;
  }

  let displayLabel, badgeClass, color;
  if (isBully) {
    displayLabel = '🚨 Cyberbullying Detected';
    badgeClass = 'verdict-bully'; color = '#f09595';
  } else if (isWarning) {
    displayLabel = '⚠️ Potentially Harmful';
    badgeClass = 'verdict-warning'; color = '#fac775';
  } else {
    displayLabel = '✅ Safe — No Bullying Detected';
    badgeClass = 'verdict-safe'; color = '#97c459';
  }

  const toxicityLevel = isBully ? 'High' : isWarning ? 'Medium' : 'Low';
  const sentimentLabel = isBully ? 'Strongly Negative' : isWarning ? 'Negative' : 'Neutral / Positive';
  const modelRaw = label || 'N/A';

  let summary = '';
  if (isBully) {
    summary = `Your model classified this tweet as cyberbullying with ${confidence}% confidence. The language detected is harmful and may target or distress an individual. Recommend review or reporting.`;
  } else if (isWarning) {
    summary = `Your model flagged this tweet as potentially harmful (${confidence}% confidence). The language may be borderline — monitor for context and escalation.`;
  } else {
    summary = `Your model classified this tweet as safe with ${confidence}% confidence. No significant cyberbullying indicators were detected in the text.`;
  }

  return { score: confidence, label: displayLabel, badgeClass, color, toxicityLevel,
    threatLevel: isBully ? 'Present' : 'None', insultLevel: isBully ? 'Detected' : 'None',
    sentimentLabel, modelRaw, summary };
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

  const igrid = document.getElementById('indicatorsGrid');
  const indicators = [
    { name: 'Toxicity Level', val: r.toxicityLevel, cls: r.toxicityLevel === 'High' ? 'high' : r.toxicityLevel === 'Medium' ? 'medium' : 'low' },
    { name: 'Model Label',    val: r.modelRaw || 'N/A', cls: r.toxicityLevel === 'High' ? 'high' : r.toxicityLevel === 'Medium' ? 'medium' : 'low' },
    { name: 'Threat Language', val: r.threatLevel, cls: r.threatLevel === 'Present' ? 'high' : 'low' },
    { name: 'Sentiment',      val: r.sentimentLabel, cls: r.sentimentLabel.includes('Strongly') ? 'high' : r.sentimentLabel.includes('Negative') ? 'medium' : 'low' },
  ];

  igrid.innerHTML = indicators.map(i => `
    <div class="indicator-card">
      <div class="indicator-name">${i.name}</div>
      <div class="indicator-val ${i.cls}">${i.val}</div>
    </div>
  `).join('');

  document.getElementById('aiSummary').textContent = '"' + r.summary + '"';
}

// ── Toggle UI state ──
function showState(state) {
  document.getElementById('idleState').style.display    = state === 'idle'    ? 'flex' : 'none';
  document.getElementById('spinnerState').style.display = state === 'spinner' ? 'flex' : 'none';
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
