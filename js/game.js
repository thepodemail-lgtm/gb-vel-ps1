'use strict';
/* GB Vel and the Shami Secret: PS1 test — main loop, world, combat, camera. */

(function () {
  const IW = TUNING.internalWidth;
  const IH = TUNING.internalHeight;

  let renderer, scene, camera, clock;
  let vel, dog, enemies = [];
  let state = 'title'; /* title | play | pause | win | over */
  let velHp = TUNING.velMaxHp;
  let invuln = 0;
  let atkT = 0, atkCd = 0, blocking = false;
  let animT = 0;
  let dogBiteCd = 0, dogBarkT = 0, dogBiting = false;
  let msgT = 0;
  let muted = false;
  let rtTarget = null;
  let jitterUniforms = { time: { value: 0 } };
  let started = false;

  const hudEl = () => document.getElementById('hud');
  const titleEl = () => document.getElementById('title-overlay');
  const pauseEl = () => document.getElementById('pause-overlay');
  const msgEl = () => document.getElementById('msg');

  function showMsg(text, sec) {
    const el = msgEl();
    el.textContent = text;
    el.style.opacity = '1';
    msgT = sec || 2.5;
  }

  function heartsStr() {
    let s = '';
    for (let i = 0; i < TUNING.velMaxHp; i++) s += i < velHp ? '♥' : '♡';
    return s;
  }

  function updateHUD() {
    const el = hudEl();
    if (!el) return;
    el.innerHTML = state === 'play' || state === 'pause'
      ? `<div style="color:#e84848">${heartsStr()}</div><div style="font-size:12px;opacity:.8;margin-top:4px">GB VEL — SHAMI CLEARING</div>`
      : '';
  }

  /* ---- PS1-ish: render to low-res target, nearest upscale ---- */
  function makeRenderer() {
    const canvas = document.getElementById('game');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(1);
    renderer.setSize(IW, IH, false);
    renderer.setClearColor(TUNING.fogColor, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    /* Nearest filtering when we blit via CSS pixelated on the canvas */
    canvas.style.imageRendering = 'pixelated';
  }

  function resize() {
    /* Keep internal buffer at IW×IH; CSS scales the canvas. */
    if (!renderer) return;
    renderer.setSize(IW, IH, false);
  }

  function buildWorld() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(TUNING.fogColor, TUNING.fogNear, TUNING.fogFar);
    scene.background = new THREE.Color(TUNING.fogColor);

    const amb = new THREE.AmbientLight(0xc8d0b8, 0.72);
    scene.add(amb);
    const sun = new THREE.DirectionalLight(0xfff0d0, 0.85);
    sun.position.set(6, 12, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xa0b0e0, 0.25);
    fill.position.set(-4, 4, -6);
    scene.add(fill);

    scene.add(Models.makeGround());
    scene.add(Models.makeTreeBorder(18));

    const tree = Models.makeShamiTree();
    tree.position.set(0, 0, 0);
    scene.add(tree);

    /* Temple ruins around the clearing */
    const ruins = [
      [-6, -5, 0.4], [6, -4, -0.5], [-5, 6, 1.2], [7, 5, -0.2],
      [-8, 1, 0.8], [5, -8, 0.1],
    ];
    ruins.forEach(([x, z, rot], i) => {
      const p = i % 2 === 0 ? Models.makeRuinPillar() : Models.makeRuinWall();
      p.position.set(x, 0, z);
      p.rotation.y = rot;
      scene.add(p);
    });
    /* Fallen column */
    const fallen = Models.makeRuinPillar();
    fallen.rotation.z = Math.PI / 2;
    fallen.position.set(3.5, 0.3, 7);
    scene.add(fallen);

    vel = Models.makeVel();
    vel.position.set(0, 0, 5);
    scene.add(vel);

    dog = Models.makeDog();
    dog.position.set(-1.5, 0, 6);
    scene.add(dog);

    enemies = [];
    const spots = [[-7, -3], [8, 2], [-3, -8]];
    for (let i = 0; i < TUNING.enemyCount; i++) {
      const e = Models.makeDemon(i % 3);
      e.position.set(spots[i][0], 0, spots[i][1]);
      e.userData.hp = TUNING.enemyHp;
      e.userData.atkCd = 1 + Math.random();
      e.userData.flash = 0;
      e.userData.kb = new THREE.Vector3();
      e.userData.alive = true;
      e.userData.attacking = false;
      scene.add(e);
      enemies.push(e);
    }

    camera = new THREE.PerspectiveCamera(50, IW / IH, 0.1, 60);
    camera.position.set(0, TUNING.camHeight, 5 + TUNING.camDistance);
  }

  /* Cheap PS1 vertex snap: nudge object positions onto a grid each frame */
  function snapVec(v) {
    const s = TUNING.vertexSnap;
    if (s <= 0) return;
    v.x = Math.round(v.x / s) * s;
    v.y = Math.round(v.y / s) * s;
    v.z = Math.round(v.z / s) * s;
  }

  function applyJitter(obj, t) {
    const j = TUNING.vertexJitter;
    if (j <= 0 || !obj) return;
    /* Subtle per-frame wobble on root position (feels like affine precision loss) */
    const id = obj.id || 1;
    obj.position.x += Math.sin(t * 17 + id) * j * 0.15;
    obj.position.z += Math.cos(t * 13 + id * 0.7) * j * 0.15;
  }

  function startGame() {
    if (started && state !== 'over' && state !== 'win' && state !== 'title') return;
    AudioFX.resume();
    AudioFX.startMusic();
    velHp = TUNING.velMaxHp;
    invuln = 0;
    atkT = 0; atkCd = 0;
    vel.position.set(0, 0, 5);
    vel.rotation.y = 0;
    dog.position.set(-1.5, 0, 6);
    enemies.forEach((e, i) => {
      const spots = [[-7, -3], [8, 2], [-3, -8]];
      e.position.set(spots[i][0], 0, spots[i][1]);
      e.userData.hp = TUNING.enemyHp;
      e.userData.alive = true;
      e.userData.flash = 0;
      e.userData.kb.set(0, 0, 0);
      e.visible = true;
      e.traverse(c => { if (c.isMesh && c.userData.baseColor == null && c.material) {
        c.userData.baseColor = c.material.color.getHex();
      }});
    });
    /* Snap chase camera behind Vel immediately (avoid fog/ground flash). */
    {
      const back = new THREE.Vector3(Math.sin(vel.rotation.y), 0, Math.cos(vel.rotation.y));
      camera.position.copy(vel.position).addScaledVector(back, -TUNING.camDistance).add(new THREE.Vector3(0, TUNING.camHeight, 0));
      camera.lookAt(vel.position.clone().add(new THREE.Vector3(0, TUNING.camLookHeight, 0)));
    }
    state = 'play';
    titleEl().style.display = 'none';
    pauseEl().style.display = 'none';
    showMsg('Clear the Shami grove of rakshasas.', 3);
    updateHUD();
    started = true;
  }

  function togglePause() {
    if (state === 'play') {
      state = 'pause';
      pauseEl().style.display = 'flex';
    } else if (state === 'pause') {
      state = 'play';
      pauseEl().style.display = 'none';
      AudioFX.resume();
    }
  }

  function hurtVel(dmg, from) {
    if (invuln > 0 || state !== 'play') return;
    let d = dmg;
    if (blocking) {
      d = Math.max(0, dmg * (1 - TUNING.blockDamageReduce));
      AudioFX.block();
      if (d <= 0) return;
    }
    velHp -= d;
    invuln = TUNING.invulnTime;
    AudioFX.hurt();
    if (from) {
      const kb = vel.position.clone().sub(from).setY(0).normalize().multiplyScalar(TUNING.knockbackForce * 0.6);
      vel.position.add(kb);
    }
    updateHUD();
    if (velHp <= 0) {
      velHp = 0;
      state = 'over';
      showMsg('Vel falls. Press Z / tap ATTACK to rise again.', 99);
      AudioFX.stopMusic();
    }
  }

  function hitEnemy(e) {
    if (!e.userData.alive) return;
    e.userData.hp -= TUNING.attackDamage;
    e.userData.flash = 0.15;
    const kb = e.position.clone().sub(vel.position).setY(0).normalize().multiplyScalar(TUNING.knockbackForce);
    e.userData.kb.copy(kb);
    AudioFX.hit();
    if (e.userData.hp <= 0) {
      e.userData.alive = false;
      e.visible = false;
      const left = enemies.filter(x => x.userData.alive).length;
      if (left === 0) {
        state = 'win';
        showMsg('The grove is quiet. The Shami tree stands.', 99);
        AudioFX.win();
        AudioFX.stopMusic();
      } else {
        showMsg(left + ' rakshasa remain.', 1.5);
      }
    }
  }

  function updatePlay(dt) {
    animT += dt;
    if (invuln > 0) invuln -= dt;
    if (atkCd > 0) atkCd -= dt;
    if (atkT > 0) atkT -= dt;
    if (msgT > 0) {
      msgT -= dt;
      if (msgT <= 0) msgEl().style.opacity = '0';
    }

    const axis = Input.moveAxis();
    blocking = Input.blockHeld() && atkT <= 0;
    const moving = Math.hypot(axis.x, axis.y) > 0.15;

    /* Camera-relative movement */
    const camYaw = Math.atan2(
      vel.position.x - camera.position.x,
      vel.position.z - camera.position.z
    );
    /* Use camera look direction on XZ from behind Vel */
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (moving && atkT <= 0 && !blocking) {
      /* Camera-relative: stick up moves forward along camera look. */
      const wish = new THREE.Vector3();
      wish.addScaledVector(right, axis.x);
      wish.addScaledVector(forward, -axis.y);
      if (wish.lengthSq() > 0.001) {
        wish.normalize();
        vel.position.addScaledVector(wish, TUNING.velSpeed * dt);
        const targetYaw = Math.atan2(wish.x, wish.z);
        let dy = targetYaw - vel.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        vel.rotation.y += dy * Math.min(1, TUNING.velTurnSpeed * dt);
      }
    }

    /* Clamp to arena */
    const R = TUNING.arenaRadius - 0.8;
    const dist = Math.hypot(vel.position.x, vel.position.z);
    if (dist > R) {
      vel.position.x *= R / dist;
      vel.position.z *= R / dist;
    }
    vel.position.y = 0;

    /* Attack */
    if (Input.attackPressed() && atkCd <= 0 && !blocking) {
      atkT = TUNING.attackDuration;
      atkCd = TUNING.attackCooldown;
      AudioFX.sword();
    }
    if (atkT > 0 && atkT < TUNING.attackDuration * 0.55 && atkT > TUNING.attackDuration * 0.15) {
      /* Active frames */
      enemies.forEach(e => {
        if (!e.userData.alive) return;
        const d = vel.position.distanceTo(e.position);
        if (d < TUNING.attackRange) {
          const toE = e.position.clone().sub(vel.position);
          const facing = new THREE.Vector3(Math.sin(vel.rotation.y), 0, Math.cos(vel.rotation.y));
          if (toE.normalize().dot(facing) > 0.15 || d < 1.0) {
            if (!e.userData._hitThisSwing) {
              e.userData._hitThisSwing = true;
              hitEnemy(e);
            }
          }
        }
      });
    } else if (atkT <= 0) {
      enemies.forEach(e => { e.userData._hitThisSwing = false; });
    }

    /* Pose Vel */
    let pose = 'idle';
    if (atkT > 0) pose = 'attack';
    else if (blocking) pose = 'block';
    else if (moving) pose = 'walk';
    Models.poseVel(vel, pose, pose === 'attack' ? (1 - atkT / TUNING.attackDuration) : animT);
    vel.visible = invuln <= 0 || Math.floor(invuln * 12) % 2 === 0;

    /* Dog follow + bite */
    dogBiteCd -= dt;
    dogBarkT -= dt;
    const dogTarget = vel.position.clone().add(new THREE.Vector3(-1.2, 0, 0.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), vel.rotation.y));
    const dogTo = dogTarget.clone().sub(dog.position);
    dogTo.y = 0;
    if (dogTo.length() > TUNING.dogFollowDist) {
      dogTo.normalize();
      dog.position.addScaledVector(dogTo, TUNING.dogSpeed * dt);
      dog.rotation.y = Math.atan2(dogTo.x, dogTo.z);
    }
    dog.position.y = 0;
    /* Occasional bark / nip nearest enemy */
    let nearest = null, nearestD = 99;
    enemies.forEach(e => {
      if (!e.userData.alive) return;
      const d = dog.position.distanceTo(e.position);
      if (d < nearestD) { nearestD = d; nearest = e; }
    });
    dogBiting = false;
    if (nearest && nearestD < 2.2 && dogBiteCd <= 0) {
      dogBiteCd = TUNING.dogBiteCooldown;
      dogBiting = true;
      nearest.userData.hp -= TUNING.dogBiteDamage;
      nearest.userData.flash = 0.12;
      nearest.userData.kb.copy(nearest.position.clone().sub(dog.position).setY(0).normalize().multiplyScalar(2));
      AudioFX.bark();
      if (nearest.userData.hp <= 0) {
        nearest.userData.alive = false;
        nearest.visible = false;
        const left = enemies.filter(x => x.userData.alive).length;
        if (left === 0) {
          state = 'win';
          showMsg('The grove is quiet. The Shami tree stands.', 99);
          AudioFX.win();
          AudioFX.stopMusic();
        }
      }
    } else if (dogBarkT <= 0 && nearest && nearestD < 8) {
      dogBarkT = TUNING.dogBarkInterval + Math.random() * 2;
      AudioFX.bark();
    }
    Models.poseDog(dog, animT, dogBiting);

    /* Enemies */
    enemies.forEach(e => {
      if (!e.userData.alive) return;
      e.userData.atkCd -= dt;
      if (e.userData.flash > 0) {
        e.userData.flash -= dt;
        e.traverse(c => {
          if (c.isMesh && c.material && c.material.color) {
            if (c.userData.baseColor == null) c.userData.baseColor = c.material.color.getHex();
            c.material.color.setHex(e.userData.flash > 0 ? 0xffffff : c.userData.baseColor);
          }
        });
      }
      if (e.userData.kb.lengthSq() > 0.01) {
        e.position.addScaledVector(e.userData.kb, dt);
        e.userData.kb.multiplyScalar(Math.max(0, 1 - 6 * dt));
      }
      const toVel = vel.position.clone().sub(e.position);
      toVel.y = 0;
      const distV = toVel.length();
      e.userData.attacking = false;
      if (distV < TUNING.enemyAggroRange && distV > 0.01) {
        toVel.normalize();
        if (distV > TUNING.enemyAttackRange * 0.85) {
          e.position.addScaledVector(toVel, TUNING.enemySpeed * dt);
        }
        e.rotation.y = Math.atan2(toVel.x, toVel.z);
        if (distV < TUNING.enemyAttackRange && e.userData.atkCd <= 0) {
          e.userData.atkCd = TUNING.enemyAttackCooldown;
          e.userData.attacking = true;
          hurtVel(TUNING.enemyDamage, e.position);
        }
      }
      /* Keep in arena */
      const ed = Math.hypot(e.position.x, e.position.z);
      if (ed > R) { e.position.x *= R / ed; e.position.z *= R / ed; }
      e.position.y = 0;
      Models.poseDemon(e, animT + e.id, e.userData.attacking || e.userData.atkCd > TUNING.enemyAttackCooldown - 0.3);
    });

    /* Chase camera */
    const back = new THREE.Vector3(Math.sin(vel.rotation.y), 0, Math.cos(vel.rotation.y));
    const desired = vel.position.clone()
      .addScaledVector(back, -TUNING.camDistance)
      .add(new THREE.Vector3(0, TUNING.camHeight, 0));
    camera.position.lerp(desired, TUNING.camLerp);
    const look = vel.position.clone().add(new THREE.Vector3(0, TUNING.camLookHeight, 0));
    camera.lookAt(look);
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    jitterUniforms.time.value += dt;

    if (Input.pausePressed()) togglePause();

    if (state === 'title') {
      /* Idle spin of camera around tree */
      const t = clock.elapsedTime;
      camera.position.set(Math.sin(t * 0.25) * 10, 5, Math.cos(t * 0.25) * 10);
      camera.lookAt(0, 1.5, 0);
      if (vel) Models.poseVel(vel, 'idle', t);
      if (dog) Models.poseDog(dog, t, false);
    } else if (state === 'play') {
      updatePlay(dt);
    } else if (state === 'over' || state === 'win') {
      if (Input.attackPressed()) {
        startGame();
      }
    }

    /* Soft PS1 snap on actors */
    if (vel) snapVec(vel.position);
    if (dog) snapVec(dog.position);
    enemies.forEach(e => { if (e.userData.alive) snapVec(e.position); });

    renderer.render(scene, camera);
    Input.endFrame();
  }

  function boot() {
    makeRenderer();
    clock = new THREE.Clock();
    buildWorld();
    Input.bindTouch(document.getElementById('touch'));
    updateHUD();
    window.addEventListener('resize', resize);
    resize();

    const startHandler = (e) => {
      if (state !== 'title') return;
      e && e.preventDefault && e.preventDefault();
      Input.tryFullscreenLandscape();
      startGame();
    };
    titleEl().addEventListener('click', startHandler);
    titleEl().addEventListener('touchend', startHandler, { passive: false });
    window.addEventListener('keydown', e => {
      if (state === 'title' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ' || e.code === 'KeyJ')) {
        startHandler(e);
      }
      if (e.code === 'KeyM') {
        muted = !muted;
        AudioFX.setMute(muted);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state === 'play') togglePause();
    });

    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
