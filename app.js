const example = `flowchart TD
    A[Runs and feedback arrive] --> B[Match project alert rules and filters]
    B --> C[Append metrics to Redis minute buckets]
    C --> D[Queue delayed aggregation job]
    D --> E[Aggregate minute and evaluate rule window]
    E --> F{Rule fires and dedup allows?}
    F -->|No| G[Finish]
    F -->|Yes| H[Check each action for suspension]
    H -->|Suspended| G
    H -->|Active| I{Shared delivery enabled?}
    I -->|No / handoff fails| J[Send inline]
    I -->|Yes| K[Queue notification for immediate delivery]
    K --> L[General delivery worker sends]
    J --> M[Handle delivery result]
    L --> M
    M --> N[Allowlisted failure: suspend action and invalidate cache]`;
const $ = id => document.getElementById(id);
const source = $('source'), viewport = $('viewport'), diagram = $('diagram');
let mermaid, scale = 1, x = 0, y = 0, width = 0, height = 0;
let revision = 0, renderId = 0, timer, running = false, pending = false, svgText = '';
try { source.value = localStorage.getItem('mermaid-source') ?? example; }
catch { source.value = example; }
function updateLines() { $('lines').textContent = `${source.value.split('\n').length} lines`; }
function transform() {
  diagram.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  $('zoom').textContent = `${Math.round(scale * 100)}%`;
}
function fit() {
  if (!width || !height) return;
  scale = Math.max(.02, Math.min(2, (viewport.clientWidth - 64) / width, (viewport.clientHeight - 48) / height));
  x = (viewport.clientWidth - width * scale) / 2;
  y = (viewport.clientHeight - height * scale) / 2;
  transform();
}
function zoom(factor, px = viewport.clientWidth / 2, py = viewport.clientHeight / 2) {
  const next = Math.max(.02, Math.min(20, scale * factor));
  x = px - (px - x) * next / scale;
  y = py - (py - y) * next / scale;
  scale = next; transform();
}
function status(message, state = '') { $('status').textContent = message; $('status').dataset.state = state; }
async function render() {
  if (!mermaid) return;
  if (running) { pending = true; return; }
  running = true; pending = false;
  const current = revision, text = source.value.trim();
  status('Rendering…');
  try {
    if (!text) {
      diagram.replaceChildren(); svgText = ''; width = height = 0;
      $('empty').textContent = 'Start typing a Mermaid diagram in the source panel.';
      $('empty').hidden = false; $('error').hidden = true; $('download').disabled = true;
      status('Waiting for source'); return;
    }
    // Render off the canvas so invalid input preserves the last valid diagram.
    const staging = document.createElement('div');
    staging.style.cssText = 'position:fixed;left:-100000px;top:0;width:1600px;visibility:hidden';
    document.body.append(staging);
    let result;
    try { result = await mermaid.render(`mermaid-${++renderId}`, text, staging); }
    finally { staging.remove(); }
    if (current !== revision) return;
    diagram.innerHTML = result.svg;
    const svg = diagram.querySelector('svg');
    const box = svg.viewBox.baseVal;
    width = box.width || 800; height = box.height || 600;
    svg.setAttribute('width', width); svg.setAttribute('height', height);
    svg.style.width = `${width}px`; svg.style.height = `${height}px`;
    svgText = new XMLSerializer().serializeToString(svg);
    $('empty').hidden = true; $('error').hidden = true; $('download').disabled = false;
    status('● Live preview', 'ready'); fit();
  } catch (error) {
    if (current !== revision) return;
    $('error').textContent = `Diagram syntax error\n${error.message || error}`;
    $('error').hidden = false;
    status(svgText ? 'Showing last valid diagram' : 'Check diagram syntax');
    if (!svgText) { $('empty').textContent = 'Your diagram will appear here once the syntax is valid.'; }
  } finally {
    running = false;
    if (pending || current !== revision) { pending = false; render(); }
  }
}
source.addEventListener('input', () => {
  revision++; updateLines();
  try { localStorage.setItem('mermaid-source', source.value); } catch {}
  clearTimeout(timer); timer = setTimeout(render, 350);
});
source.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  source.setRangeText('    ', source.selectionStart, source.selectionEnd, 'end');
  source.dispatchEvent(new Event('input'));
});
$('example').onclick = () => { source.value = example; source.dispatchEvent(new Event('input')); };
$('in').onclick = () => zoom(1.25);
$('out').onclick = () => zoom(.8);
$('fit').onclick = fit;
viewport.addEventListener('wheel', event => {
  event.preventDefault();
  const bounds = viewport.getBoundingClientRect();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
  zoom(Math.exp(-Math.max(-150, Math.min(150, delta)) * (event.ctrlKey ? .012 : .003)), event.clientX - bounds.left, event.clientY - bounds.top);
}, { passive: false });
const pointers = new Map();
viewport.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  viewport.focus(); viewport.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  viewport.classList.add('dragging');
});
viewport.addEventListener('pointermove', event => {
  if (!pointers.has(event.pointerId)) return;
  const before = [...pointers.values()];
  const previous = pointers.get(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    const after = [...pointers.values()], bounds = viewport.getBoundingClientRect();
    const oldDistance = Math.hypot(before[0].x - before[1].x, before[0].y - before[1].y);
    const newDistance = Math.hypot(after[0].x - after[1].x, after[0].y - after[1].y);
    if (oldDistance > 0) zoom(newDistance / oldDistance, (before[0].x + before[1].x) / 2 - bounds.left, (before[0].y + before[1].y) / 2 - bounds.top);
    x += (after[0].x + after[1].x - before[0].x - before[1].x) / 2;
    y += (after[0].y + after[1].y - before[0].y - before[1].y) / 2;
  } else { x += event.clientX - previous.x; y += event.clientY - previous.y; }
  transform();
});
function release(event) { pointers.delete(event.pointerId); if (!pointers.size) viewport.classList.remove('dragging'); }
viewport.addEventListener('pointerup', release);
viewport.addEventListener('pointercancel', release);
viewport.addEventListener('lostpointercapture', release);
viewport.addEventListener('keydown', event => {
  if (['+', '=', '-', '0'].includes(event.key)) {
    event.preventDefault(); event.key === '0' ? fit() : zoom(event.key === '-' ? .8 : 1.25);
  }
});
viewport.addEventListener('dblclick', fit);
new ResizeObserver(fit).observe(viewport);
$('download').onclick = () => {
  if (!svgText) return;
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagram.svg'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
updateLines();
try {
  ({ default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.esm.min.mjs'));
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base',
    maxTextSize: 200000, maxEdges: 3000,
    themeVariables: { primaryColor: '#f0edfc', primaryTextColor: '#393451', primaryBorderColor: '#a598d7', lineColor: '#8b83a6', secondaryColor: '#edf5f3', tertiaryColor: '#f5f3fc', fontFamily: 'system-ui, sans-serif', fontSize: '14px' },
    flowchart: { htmlLabels: false, useMaxWidth: false, curve: 'basis' } });
  render();
} catch {
  status('Renderer unavailable');
  $('empty').textContent = 'Unable to load Mermaid. Check your internet connection and reload.';
}
