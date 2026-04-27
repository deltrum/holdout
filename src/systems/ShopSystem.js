import * as THREE from 'three';
import { SHOP_ITEMS } from '../config/shopItems.js';
import { createTurret } from '../entities/createTurret.js';
import { createMine } from '../entities/createMine.js';
import { WEAPON_TYPES } from '../config/weaponTypes.js';

export class ShopSystem {
  constructor(scene) {
    this._scene = scene;
    this.shopOpen = false;
    this.placementMode = false;
    this.selectedItem = null; // SHOP_ITEMS entry
    this.activePlayer = 1;   // which player opened the shop
    this._ghostMesh = null;
    this._panel = document.getElementById('shop-panel');
    this._itemsEl = document.getElementById('shop-items');
    this._statusEl = document.getElementById('shop-status');
    this._built = false;
  }

  _buildItemList() {
    if (this._built) return;
    this._built = true;
    this._itemsEl.innerHTML = '';
    let lastCat = '';
    for (const item of SHOP_ITEMS) {
      const cat = item.category || 'turret';
      if (cat !== lastCat) {
        const header = document.createElement('div');
        header.className = 'shop-category';
        const labels = { turret: '-- TURRETS --', placeable: '-- PLACEABLES --', weapon: '-- WEAPONS --' };
        header.textContent = labels[cat] || '-- ITEMS --';
        this._itemsEl.appendChild(header);
        lastCat = cat;
      }
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.dataset.key = item.key;
      row.innerHTML = `<span class="shop-item-key">[${item.key}]</span><span class="shop-item-name">${item.name}</span><span class="shop-item-cost">${item.cost}pts</span>`;
      this._itemsEl.appendChild(row);
    }
  }

  update(dt, engine) {
    const { inputSystem, entityManager, gameState, renderSystem, audioSystem } = engine;

    // Toggle shop
    if (inputSystem._shopToggle) {
      if (this.placementMode) {
        this._cancelPlacement();
      } else {
        this.shopOpen = !this.shopOpen;
      }
    }

    // Cancel with Escape
    if (inputSystem._shopCancel) {
      if (this.placementMode) {
        this._cancelPlacement();
      } else if (this.shopOpen) {
        this.shopOpen = false;
      }
    }

    // Item selection (0-9)
    if (this.shopOpen && inputSystem._shopSelect) {
      const item = SHOP_ITEMS.find(i => i.key === inputSystem._shopSelect);
      if (item) {
        const score = gameState.score[this.activePlayer] || 0;
        if (score >= item.cost) {
          if (item.category === 'weapon') {
            // Weapon: instant buy + equip, no placement
            const player = entityManager.getEntitiesByTag('player' + this.activePlayer)[0];
            if (player) {
              const shooter = player.getComponent('Shooter');
              if (shooter && !shooter.ownedWeapons.includes(item.type)) {
                gameState.score[this.activePlayer] -= item.cost;
                shooter.ownedWeapons.push(item.type);
                shooter.switchWeapon(item.type, WEAPON_TYPES[item.type]);
                this._statusEl.textContent = `EQUIPPED: ${item.name}!`;
                if (engine.audioSystem) engine.audioSystem.playReload();
                setTimeout(() => { this._statusEl.textContent = 'Select an item [0-9]'; }, 1500);
              } else if (shooter && shooter.ownedWeapons.includes(item.type)) {
                this._statusEl.textContent = 'Already owned!';
                setTimeout(() => { this._statusEl.textContent = 'Select an item [0-9]'; }, 1000);
              }
            }
          } else {
            // Turret or placeable: enter placement mode
            this.selectedItem = item;
            this.placementMode = true;
            this._createGhost(item);
            this._statusEl.textContent = `PLACING: ${item.name} — Click to place`;
          }
        }
      }
    }

    // Placement mode: move ghost, place on click
    if (this.placementMode && this.selectedItem) {
      const players = entityManager.getEntitiesByTag('player' + this.activePlayer);
      const player = players[0];
      if (player && player.alive) {
        const pos = player.getComponent('Transform').position;
        const rot = player.getComponent('Transform').rotation;
        // Place 2 units in front of player
        const px = pos.x + Math.sin(rot) * 2;
        const pz = pos.z + Math.cos(rot) * 2;

        if (this._ghostMesh) {
          this._ghostMesh.position.set(px, 0, pz);
        }

        // Check affordability for ghost tint
        const canAfford = (gameState.score[this.activePlayer] || 0) >= this.selectedItem.cost;
        if (this._ghostMesh) {
          this._ghostMesh.traverse(c => {
            if (c.material && c.material.color) {
              c.material.color.setHex(canAfford ? 0x00ff88 : 0xff4444);
            }
          });
        }

        // Place on shoot
        const shooting = inputSystem.getShootForPlayer
          ? inputSystem.getShootForPlayer(this.activePlayer)
          : inputSystem.mouseDown;

        if (shooting && canAfford) {
          gameState.score[this.activePlayer] -= this.selectedItem.cost;
          if (this.selectedItem.category === 'placeable' && this.selectedItem.type === 'mine') {
            createMine(entityManager, renderSystem.scene, { x: px, z: pz });
          } else {
            createTurret(entityManager, renderSystem.scene, { x: px, z: pz }, this.selectedItem.type);
          }
          if (audioSystem) audioSystem.playReload();
          this._cancelPlacement();
        }
      }
    }

    // Update UI
    this._updateUI(gameState);
  }

  _createGhost(item) {
    this._removeGhost();

    let geo, y;
    if (item.category === 'placeable' && item.type === 'mine') {
      // Flat disc for mines
      geo = new THREE.BoxGeometry(0.8, 0.2, 0.8);
      y = 0.15;
    } else {
      // Tall box for turrets
      geo = new THREE.BoxGeometry(1.2, 1.5, 1.2);
      y = 0.75;
    }
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.3,
      fog: false,
      depthWrite: false,
    });
    this._ghostMesh = new THREE.Mesh(geo, mat);
    this._ghostMesh.position.y = y;
    this._scene.add(this._ghostMesh);
  }

  _removeGhost() {
    if (this._ghostMesh) {
      this._scene.remove(this._ghostMesh);
      this._ghostMesh.geometry.dispose();
      this._ghostMesh.material.dispose();
      this._ghostMesh = null;
    }
  }

  _cancelPlacement() {
    this.placementMode = false;
    this.selectedItem = null;
    this._removeGhost();
    this._statusEl.textContent = 'Select an item [0-9]';
  }

  _updateUI(gameState) {
    if (this.shopOpen || this.placementMode) {
      this._buildItemList();
      this._panel.classList.remove('hidden');

      const score = gameState.score[this.activePlayer] || 0;
      const rows = this._itemsEl.querySelectorAll('.shop-item');
      rows.forEach(row => {
        const item = SHOP_ITEMS.find(i => i.key === row.dataset.key);
        if (!item) return;
        row.classList.toggle('cant-afford', score < item.cost);
        row.classList.toggle('selected', this.selectedItem === item);
      });

      if (!this.placementMode) {
        this._statusEl.textContent = 'Select an item [0-9]';
      }
    } else {
      this._panel.classList.add('hidden');
    }
  }

  reset() {
    this.shopOpen = false;
    this.placementMode = false;
    this.selectedItem = null;
    this._removeGhost();
    this._panel.classList.add('hidden');
  }
}
