export function createGesture(onDrag, onTap) {
  let active = null, startX = 0, startY = 0, moved = false, blocked = false;
  const pointers = new Set();
  return {
    down(id, x, y) {
      pointers.add(id);
      if (pointers.size > 1) { blocked = true; active = null; return; }
      if (blocked) return;
      active = id; startX = x; startY = y; moved = false;
    },
    move(id, x, y) {
      if (active !== id || blocked) return;
      if (Math.hypot(x - startX, y - startY) > 7) moved = true;
      if (moved) onDrag(x - startX);
    },
    up(id, x, y) {
      if (id === active && !blocked && !moved && Math.hypot(x - startX, y - startY) <= 7) onTap(x, y);
      pointers.delete(id);
      if (id === active) active = null;
      if (pointers.size === 0) blocked = false;
    },
    cancel() { active = null; pointers.clear(); blocked = false; },
  };
}
export function bindInput(canvas, getRun, getHeight) {
  let base = 120, bounds;
  const cleanups = [];
  const listen = (target, type, callback, options) => { target.addEventListener(type, callback, options); cleanups.push(() => target.removeEventListener(type, callback, options)); };
  const gesture = createGesture(dx => {
    const run = getRun(); if (run && run.status === 'running') run.target = Math.max(0, Math.min(240, base + dx * 240 / bounds.width));
  }, (x, y) => {
    const run = getRun(); if (!run || run.status !== 'running') return;
    const cx = (x - bounds.left) * 240 / bounds.width;
    const cy = (y - bounds.top) * getHeight() / bounds.height;
    canvas.dispatchEvent(new CustomEvent('water-tap', { detail: { x: cx, worldY: run.distance + getHeight() * 0.72 - cy } }));
  });
  const down = (id, x, y) => { const r = getRun(); if (!r || r.status !== 'running') return; bounds = canvas.getBoundingClientRect(); base = r.x; gesture.down(id, x, y); };
  if (window.PointerEvent) {
    listen(canvas, 'pointerdown', e => { e.preventDefault(); down(e.pointerId, e.clientX, e.clientY); if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); });
    listen(canvas, 'pointermove', e => gesture.move(e.pointerId, e.clientX, e.clientY));
    listen(canvas, 'pointerup', e => gesture.up(e.pointerId, e.clientX, e.clientY));
    listen(canvas, 'pointercancel', () => gesture.cancel());
  } else {
    const each = (e, fn) => { e.preventDefault(); Array.prototype.forEach.call(e.changedTouches, t => fn(t.identifier, t.clientX, t.clientY)); };
    listen(canvas, 'touchstart', e => each(e, down), { passive: false });
    listen(canvas, 'touchmove', e => each(e, gesture.move), { passive: false });
    listen(canvas, 'touchend', e => each(e, gesture.up), { passive: false });
    listen(canvas, 'touchcancel', () => gesture.cancel());
    listen(canvas, 'mousedown', e => down(1, e.clientX, e.clientY));
    listen(window, 'mousemove', e => gesture.move(1, e.clientX, e.clientY));
    listen(window, 'mouseup', e => gesture.up(1, e.clientX, e.clientY));
  }
  gesture.destroy = () => { gesture.cancel(); cleanups.forEach(fn => fn()); };
  return gesture;
}
