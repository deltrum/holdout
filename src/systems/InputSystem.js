import * as THREE from 'three';

const DEADZONE = 0.15;

function applyDeadzone(value) {
  if (Math.abs(value) < DEADZONE) return 0;
  const sign = value > 0 ? 1 : -1;
  return sign * (Math.abs(value) - DEADZONE) / (1 - DEADZONE);
}

export class InputSystem {
  constructor(canvas, camera, groundPlane) {
    this.keys = new Set();
    this.mouse = { x: 0, z: 0, screenX: 0, screenY: 0 };
    this._realMouseDown = false;
    this.mouseDown = false;
    this.mouseJustPressed = false;
    this._wasDown = false;
    this._canvas = canvas;
    this._camera = camera;
    this._groundPlane = groundPlane;
    this._raycaster = new THREE.Raycaster();
    this._mouseNDC = new THREE.Vector2();
    this._reloadPressed = false;
    this._mutePressed = false;

    // Per-player gamepad state (index 0 = P1 gamepad, index 1 = P2 gamepad)
    this._gamepads = [null, null]; // gamepad indices
    this._gpState = [
      { move: { x: 0, z: 0 }, aim: { x: 0, z: 0 }, aimAngle: 0, aimActive: false, shoot: false, reload: false, reloadWas: false, mute: false, muteWas: false, mineWas: false, barricadeWas: false, shopWas: false, wpnPrevWas: false, wpnNextWas: false },
      { move: { x: 0, z: 0 }, aim: { x: 0, z: 0 }, aimAngle: 0, aimActive: false, shoot: false, reload: false, reloadWas: false, mute: false, muteWas: false, mineWas: false, barricadeWas: false, shopWas: false, wpnPrevWas: false, wpnNextWas: false },
    ];

    // Per-player aim world positions
    this._playerMouse = [
      { x: 0, z: 0 },
      { x: 0, z: 0 },
    ];

    // P2 reload/mute (edge-triggered per frame)
    this._p2ReloadPressed = false;
    this._p2MutePressed = false;

    // Mine placement (edge-triggered)
    this._minePlacePressed = [false, false];
    // Barricade placement (edge-triggered)
    this._barricadePlacePressed = [false, false];

    // Shop (edge-triggered)
    this._shopToggle = false;
    this._shopSelect = null; // '0'-'9' or null
    this._shopCancel = false;

    // Weapon switch (edge-triggered per player)
    this._weaponNext = [false, false];
    this._weaponPrev = [false, false];

    // Keyboard/mouse listeners
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyR') this._reloadPressed = true;
      if (e.code === 'KeyM') this._mutePressed = true;
      if (e.code === 'KeyB') this._barricadePlacePressed[0] = true;
      if (e.code === 'Tab') { e.preventDefault(); this._shopToggle = true; }
      if (e.code === 'Escape') this._shopCancel = true;
      if (e.code >= 'Digit0' && e.code <= 'Digit9') this._shopSelect = e.code.charAt(5);
      if (e.code === 'KeyQ') this._weaponPrev[0] = true;
      if (e.code === 'KeyE') this._weaponNext[0] = true;
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      this.mouse.screenX = e.clientX;
      this.mouse.screenY = e.clientY;
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) this._realMouseDown = true;
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this._realMouseDown = false;
    };
    this._onContextMenu = (e) => e.preventDefault();

    // Gamepad connect/disconnect — assign to first free slot
    this._onGamepadConnected = (e) => {
      const idx = e.gamepad.index;
      if (this._gamepads[0] === null) {
        this._gamepads[0] = idx;
        console.log('Gamepad assigned to P1:', e.gamepad.id);
      } else if (this._gamepads[1] === null && this._gamepads[0] !== idx) {
        this._gamepads[1] = idx;
        console.log('Gamepad assigned to P2:', e.gamepad.id);
      }
    };
    this._onGamepadDisconnected = (e) => {
      const idx = e.gamepad.index;
      if (this._gamepads[0] === idx) { this._gamepads[0] = null; console.log('P1 gamepad disconnected'); }
      if (this._gamepads[1] === idx) { this._gamepads[1] = null; console.log('P2 gamepad disconnected'); }
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('contextmenu', this._onContextMenu);
    window.addEventListener('gamepadconnected', this._onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this._onGamepadDisconnected);
  }

  update() {
    this._pollAllGamepads();

    // Mouse → world coordinates
    this._mouseNDC.x = (this.mouse.screenX / this._canvas.clientWidth) * 2 - 1;
    this._mouseNDC.y = -(this.mouse.screenY / this._canvas.clientHeight) * 2 + 1;
    this._raycaster.setFromCamera(this._mouseNDC, this._camera);
    const hits = this._raycaster.intersectObject(this._groundPlane);
    if (hits.length > 0) {
      this.mouse.x = hits[0].point.x;
      this.mouse.z = hits[0].point.z;
    }

    // P1 mouse world = real mouse (overridden by gamepad stick in updateAimWorldPos)
    this._playerMouse[0].x = this.mouse.x;
    this._playerMouse[0].z = this.mouse.z;

    // P1 combined shoot
    this.mouseDown = this._realMouseDown || this._gpState[0].shoot;
    this.mouseJustPressed = this.mouseDown && !this._wasDown;
    this._wasDown = this.mouseDown;
  }

  _pollAllGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    // Auto-detect gamepads if slots are empty
    for (const pad of gamepads) {
      if (!pad || !pad.connected) continue;
      const idx = pad.index;
      if (this._gamepads[0] === idx || this._gamepads[1] === idx) continue;
      if (this._gamepads[0] === null) { this._gamepads[0] = idx; }
      else if (this._gamepads[1] === null) { this._gamepads[1] = idx; }
    }

    // Poll each slot
    for (let slot = 0; slot < 2; slot++) {
      const state = this._gpState[slot];
      state.move.x = 0;
      state.move.z = 0;
      state.aim.x = 0;
      state.aim.z = 0;
      state.shoot = false;
      state.aimActive = false;

      const gpIdx = this._gamepads[slot];
      if (gpIdx === null) continue;
      const gp = gamepads[gpIdx];
      if (!gp || !gp.connected) { this._gamepads[slot] = null; continue; }

      // Left stick → movement
      if (gp.axes.length >= 2) {
        state.move.x = applyDeadzone(gp.axes[0]);
        state.move.z = applyDeadzone(gp.axes[1]);
      }

      // Right stick → aim
      if (gp.axes.length >= 4) {
        const ax = applyDeadzone(gp.axes[2]);
        const az = applyDeadzone(gp.axes[3]);
        if (Math.abs(ax) > 0 || Math.abs(az) > 0) {
          state.aim.x = ax;
          state.aim.z = az;
          state.aimAngle = Math.atan2(ax, az);
          state.aimActive = true;
        }
      }

      // RT / RB → shoot
      if (gp.buttons.length > 7) {
        const rt = gp.buttons[7];
        const rb = gp.buttons[5];
        state.shoot = (rt && (rt.pressed || rt.value > 0.5)) || (rb && rb.pressed);
      }

      // B / LB → reload (edge-triggered)
      if (gp.buttons.length > 4) {
        const b = gp.buttons[1];
        const lb = gp.buttons[4];
        const now = (b && b.pressed) || (lb && lb.pressed);
        if (now && !state.reloadWas) {
          if (slot === 0) this._reloadPressed = true;
          else this._p2ReloadPressed = true;
        }
        state.reloadWas = now;
      }

      // A → place barricade (edge-triggered)
      if (gp.buttons.length > 0) {
        const a = gp.buttons[0];
        const now = a && a.pressed;
        if (now && !state.barricadeWas) this._barricadePlacePressed[slot] = true;
        state.barricadeWas = now;
      }

      // Y → mute (edge-triggered, any player)
      if (gp.buttons.length > 3) {
        const y = gp.buttons[3];
        const now = y && y.pressed;
        if (now && !state.muteWas) this._mutePressed = true;
        state.muteWas = now;
      }

      // Start (button 9) → shop toggle (edge-triggered)
      if (gp.buttons.length > 9) {
        const start = gp.buttons[9];
        const now = start && start.pressed;
        if (now && !state.shopWas) this._shopToggle = true;
        state.shopWas = now;
      }

      // D-pad left (14) / right (15) → weapon switch (edge-triggered)
      if (gp.buttons.length > 15) {
        const left = gp.buttons[14];
        const right = gp.buttons[15];
        const lNow = left && left.pressed;
        const rNow = right && right.pressed;
        if (lNow && !state.wpnPrevWas) this._weaponPrev[slot] = true;
        if (rNow && !state.wpnNextWas) this._weaponNext[slot] = true;
        state.wpnPrevWas = lNow;
        state.wpnNextWas = rNow;
      }
    }
  }

  postUpdate() {
    this._reloadPressed = false;
    this._mutePressed = false;
    this._p2ReloadPressed = false;
    this._minePlacePressed[0] = false;
    this._minePlacePressed[1] = false;
    this._barricadePlacePressed[0] = false;
    this._barricadePlacePressed[1] = false;
    this._shopToggle = false;
    this._shopSelect = null;
    this._shopCancel = false;
    this._weaponNext[0] = false;
    this._weaponNext[1] = false;
    this._weaponPrev[0] = false;
    this._weaponPrev[1] = false;
  }

  get reloadPressed() { return this._reloadPressed; }
  get mutePressed() { return this._mutePressed; }
  get gamepadConnected() { return this._gamepads[0] !== null; }
  get p2GamepadConnected() { return this._gamepads[1] !== null; }

  getMinePlaceForPlayer(playerIndex) {
    return this._minePlacePressed[playerIndex - 1];
  }

  getBarricadePlaceForPlayer(playerIndex) {
    return this._barricadePlacePressed[playerIndex - 1];
  }

  getWeaponSwitchForPlayer(playerIndex) {
    const s = playerIndex - 1;
    if (this._weaponNext[s]) return 1;
    if (this._weaponPrev[s]) return -1;
    return 0;
  }

  // --- Per-player methods (playerIndex: 1 or 2) ---

  getMovementForPlayer(playerIndex) {
    const slot = playerIndex - 1;
    const gp = this._gpState[slot];

    if (playerIndex === 1) {
      // Keyboard input
      let x = 0, z = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
      // Gamepad overrides if active
      if (Math.abs(gp.move.x) > 0 || Math.abs(gp.move.z) > 0) {
        x = gp.move.x;
        z = gp.move.z;
      }
      const len = Math.sqrt(x * x + z * z);
      if (len > 1) { x /= len; z /= len; }
      return { x, z };
    } else {
      // P2: gamepad only
      let x = gp.move.x;
      let z = gp.move.z;
      const len = Math.sqrt(x * x + z * z);
      if (len > 1) { x /= len; z /= len; }
      return { x, z };
    }
  }

  getShootForPlayer(playerIndex) {
    if (playerIndex === 1) return this.mouseDown;
    return this._gpState[1].shoot;
  }

  getReloadForPlayer(playerIndex) {
    if (playerIndex === 1) return this._reloadPressed;
    return this._p2ReloadPressed;
  }

  getAimForPlayer(playerIndex, playerX, playerZ) {
    const slot = playerIndex - 1;
    const gp = this._gpState[slot];
    if (gp.aimActive) return gp.aimAngle;
    if (playerIndex === 1) return Math.atan2(this.mouse.x - playerX, this.mouse.z - playerZ);
    // P2 without stick: face forward
    return 0;
  }

  getMouseForPlayer(playerIndex) {
    return this._playerMouse[playerIndex - 1];
  }

  updateAimWorldPos(playerIndex, playerX, playerZ, aimRange) {
    const slot = playerIndex - 1;
    const gp = this._gpState[slot];
    if (gp.aimActive) {
      this._playerMouse[slot].x = playerX + gp.aim.x * aimRange;
      this._playerMouse[slot].z = playerZ + gp.aim.z * aimRange;
    } else if (playerIndex === 1) {
      this._playerMouse[0].x = this.mouse.x;
      this._playerMouse[0].z = this.mouse.z;
    }
  }

  // Legacy single-player compat (used by AIController)
  getMovementVector() { return this.getMovementForPlayer(1); }
  getAimAngle(px, pz) { return this.getAimForPlayer(1, px, pz); }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._canvas.removeEventListener('mousemove', this._onMouseMove);
    this._canvas.removeEventListener('mousedown', this._onMouseDown);
    this._canvas.removeEventListener('mouseup', this._onMouseUp);
    this._canvas.removeEventListener('contextmenu', this._onContextMenu);
    window.removeEventListener('gamepadconnected', this._onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this._onGamepadDisconnected);
  }
}
