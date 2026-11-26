// Keyboard and mouse input: throttle on W/S, pitch on arrows up/down, roll
// on arrows left/right (A/D also roll), G toggles gear, C swaps the camera,
// P pauses, M mutes. Mouse drag looks around the chase camera; clicks are
// for menus, handled by main.js.
export const ACTION_PAUSE = 'pause';
export const ACTION_CAMERA = 'camera';
export const ACTION_GEAR = 'gear';
export const ACTION_MUTE = 'mute';
export const ACTION_CONFIRM = 'confirm';

export function createFlightInput() {
  const keys = new Set();
  const pressed = new Set();
  let lookX = 0;
  let lookY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseDown(event) {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  }
  function onMouseMove(event) {
    if (!dragging) return;
    lookX += (event.clientX - lastX) * 0.004;
    lookY += (event.clientY - lastY) * 0.004;
    lookY = Math.max(-0.5, Math.min(0.5, lookY));
    lastX = event.clientX;
    lastY = event.clientY;
  }
  function onMouseUp() {
    dragging = false;
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return {
    read() {
      const throttleDelta = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
      const pitch = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
      const roll = (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0)
        - (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0);
      return { throttleDelta, pitch, roll, lookX, lookY };
    },
    consume(code) {
      if (!pressed.has(code)) return false;
      pressed.delete(code);
      return true;
    },
    wasPressed(action) {
      if (action === ACTION_PAUSE) return this.consume('KeyP') || this.consume('Escape');
      if (action === ACTION_CAMERA) return this.consume('KeyC');
      if (action === ACTION_GEAR) return this.consume('KeyG');
      if (action === ACTION_MUTE) return this.consume('KeyM');
      if (action === ACTION_CONFIRM) return this.consume('Enter') || this.consume('Space');
      return false;
    },
    resetLook() {
      lookX = 0;
      lookY = 0;
    },
  };
}
