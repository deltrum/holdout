# Zombie Defense

A top-down co-op zombie shooter that runs in the browser. Survive waves, spend kills on turrets and barricades, keep your base alive.

Built with Three.js and Vite. No audio files — every gunshot, reload, and explosion is synthesized at runtime through the Web Audio API.

## Running it

```
npm install
npm run dev
```

Open http://localhost:5173. Three buttons on the menu:

- **Start Game** — play it.
- **Watch AI Play** — a DQN agent (TensorFlow.js) drives Player 1.
- **Train AI** — fast-forwarded training mode with replay buffer and target network.

## Controls

Player 1 is keyboard + mouse. Player 2 is gamepad. Plug in two pads if you want couch co-op.

|  | P1 (kb/mouse) | Gamepad |
|---|---|---|
| Move | WASD | Left stick |
| Aim | Mouse | Right stick |
| Shoot | Click | RT / RB |
| Reload | R | B / LB |
| Barricade | B | A |
| Switch weapon | Q / E | D-pad |
| Shop | Tab | Start |

## What's in the box

- Eight turret types, from a basic auto-gun up to a Mega Turret with twin miniguns and homing rocket pods.
- Six zombie types unlocking as waves progress, including runners that zigzag and brutes that soak hits.
- A flamethrower for the player, buyable from the shop.
- A rescue helicopter on intro, a side-door gunship that strafes the field starting on wave 2.
- Mines, barricades, power-up drops, per-player scoring.
- When you die you don't quit — you become a player-controlled zombie and can spawn more from your corpse. The game ends when every human player is down.

## Code

ECS — entities + data-only components + stateless systems. Everything (turret, zombie, projectile, mine, barricade, NPC, power-up) flows through the same `EntityManager`. The full game loop lives in `src/core/GameEngine.js`; that's the one file to read if you want to understand how the rest fits together.
