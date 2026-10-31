'use strict';
/* Original low-poly models from Three.js primitives. No ripped assets. */

const Models = (() => {
  const C = {
    skin: 0xc48a5c,
    hair: 0x1a1210,
    cloth: 0x8b1e1e,
    scarf: 0xc42828,
    metal: 0xc0c8d0,
    wood: 0x6b4423,
    shield: 0xd4a84b,
    dogFur: 0xd8d0c4,
    dogEar: 0xb8a090,
    demon: 0x4a6b3a,
    demonDark: 0x2a3a22,
    horn: 0xe8d8a0,
    eye: 0xff4422,
    stone: 0x8a8678,
    moss: 0x5a7a48,
    bark: 0x5a3a22,
    leaf: 0x3d7a38,
    leafLite: 0x6aaa48,
    ground: 0x6b8a4e,
    dirt: 0x8a7048,
    gold: 0xd4b050,
  };

  function mat(color, flat) {
    return new THREE.MeshLambertMaterial({
      color,
      flatShading: flat !== false,
    });
  }

  function box(w, h, d, color, flat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, flat));
    m.castShadow = false; m.receiveShadow = false;
    return m;
  }
  function cyl(rt, rb, h, seg, color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 6), mat(color));
    return m;
  }
  function cone(r, h, seg, color) {
    return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 5), mat(color));
  }
  function sph(r, seg, color) {
    return new THREE.Mesh(new THREE.SphereGeometry(r, seg || 6, seg || 5), mat(color));
  }

  /* ---- Vel: limb parts for simple skeletal animation ---- */
  function makeVel() {
    const root = new THREE.Group();
    root.name = 'vel';

    const torso = box(0.42, 0.55, 0.28, C.cloth);
    torso.position.y = 1.05;
    root.add(torso);

    const scarf = box(0.48, 0.12, 0.32, C.scarf);
    scarf.position.set(0, 1.28, 0);
    root.add(scarf);

    const head = box(0.32, 0.34, 0.30, C.skin);
    head.position.y = 1.52;
    root.add(head);
    const hair = box(0.34, 0.14, 0.32, C.hair);
    hair.position.y = 1.70;
    root.add(hair);

    const hips = box(0.40, 0.18, 0.26, C.cloth);
    hips.position.y = 0.72;
    root.add(hips);

    function limb(w, h, d, color) {
      const g = new THREE.Group();
      const mesh = box(w, h, d, color);
      mesh.position.y = -h / 2;
      g.add(mesh);
      return g;
    }

    const Larm = limb(0.14, 0.42, 0.14, C.skin);
    Larm.position.set(-0.30, 1.28, 0);
    root.add(Larm);
    const Rarm = limb(0.14, 0.42, 0.14, C.skin);
    Rarm.position.set(0.30, 1.28, 0);
    root.add(Rarm);

    const Lleg = limb(0.16, 0.55, 0.16, C.cloth);
    Lleg.position.set(-0.12, 0.68, 0);
    root.add(Lleg);
    const Rleg = limb(0.16, 0.55, 0.16, C.cloth);
    Rleg.position.set(0.12, 0.68, 0);
    root.add(Rleg);

    /* Sword in right hand */
    const sword = new THREE.Group();
    const blade = box(0.06, 0.72, 0.10, C.metal);
    blade.position.y = -0.36;
    sword.add(blade);
    const hilt = box(0.08, 0.16, 0.08, C.wood);
    hilt.position.y = 0.02;
    sword.add(hilt);
    const guard = box(0.22, 0.05, 0.08, C.gold);
    guard.position.y = -0.06;
    sword.add(guard);
    sword.position.set(0, -0.42, 0);
    Rarm.add(sword);

    /* Shield in left hand */
    const shield = new THREE.Group();
    const plate = cyl(0.28, 0.28, 0.06, 6, C.shield);
    plate.rotation.x = Math.PI / 2;
    shield.add(plate);
    const boss = sph(0.07, 5, C.gold);
    boss.position.z = 0.05;
    shield.add(boss);
    shield.position.set(0, -0.35, 0.18);
    Larm.add(shield);

    root.userData.parts = { torso, head, Larm, Rarm, Lleg, Rleg, sword, shield };
    return root;
  }

  function poseVel(root, state, t) {
    const p = root.userData.parts;
    if (!p) return;
    const walk = state === 'walk';
    const attack = state === 'attack';
    const block = state === 'block';
    const phase = t * (walk ? 9 : 2);

    /* Reset */
    p.Larm.rotation.set(0, 0, 0.15);
    p.Rarm.rotation.set(0, 0, -0.15);
    p.Lleg.rotation.set(0, 0, 0);
    p.Rleg.rotation.set(0, 0, 0);
    p.sword.rotation.set(0, 0, 0);
    p.shield.rotation.set(0, 0, 0);
    p.torso.rotation.set(0, 0, 0);

    if (walk) {
      const s = Math.sin(phase);
      p.Lleg.rotation.x = s * 0.7;
      p.Rleg.rotation.x = -s * 0.7;
      p.Larm.rotation.x = -s * 0.55;
      p.Rarm.rotation.x = s * 0.55;
      p.torso.position.y = 1.05 + Math.abs(Math.sin(phase)) * 0.03;
    } else if (attack) {
      /* Slash arc over attackDuration */
      const a = Math.min(1, t);
      const swing = a < 0.35 ? (a / 0.35) * -1.8 : -1.8 + ((a - 0.35) / 0.65) * 2.6;
      p.Rarm.rotation.x = swing;
      p.Rarm.rotation.y = a < 0.5 ? a * 1.2 : (1 - a) * 1.2;
      p.sword.rotation.z = -0.4;
      p.torso.rotation.y = (a - 0.5) * 0.6;
      p.Larm.rotation.x = -0.3;
    } else if (block) {
      p.Larm.rotation.x = -1.1;
      p.Larm.rotation.y = 0.6;
      p.shield.rotation.y = -0.4;
      p.Rarm.rotation.x = -0.4;
      p.torso.rotation.y = 0.25;
    } else {
      /* idle breathe */
      p.torso.position.y = 1.05 + Math.sin(t * 2) * 0.015;
      p.Larm.rotation.z = 0.2 + Math.sin(t * 1.5) * 0.05;
      p.Rarm.rotation.z = -0.2 - Math.sin(t * 1.5) * 0.05;
    }
  }

  /* ---- Dog companion ---- */
  function makeDog() {
    const root = new THREE.Group();
    const body = box(0.55, 0.28, 0.32, C.dogFur);
    body.position.y = 0.32;
    root.add(body);
    const head = box(0.28, 0.24, 0.26, C.dogFur);
    head.position.set(0.32, 0.40, 0);
    root.add(head);
    const snout = box(0.16, 0.12, 0.14, C.dogEar);
    snout.position.set(0.48, 0.34, 0);
    root.add(snout);
    const earL = box(0.08, 0.16, 0.06, C.dogEar);
    earL.position.set(0.28, 0.54, 0.10);
    root.add(earL);
    const earR = earL.clone();
    earR.position.z = -0.10;
    root.add(earR);
    const tail = box(0.08, 0.08, 0.28, C.dogFur);
    tail.position.set(-0.32, 0.40, 0);
    tail.rotation.y = 0.3;
    root.add(tail);
    [[0.18, 0.12], [0.18, -0.12], [-0.18, 0.12], [-0.18, -0.12]].forEach(([x, z]) => {
      const leg = box(0.08, 0.22, 0.08, C.dogFur);
      leg.position.set(x, 0.11, z);
      root.add(leg);
    });
    root.userData.tail = tail;
    root.userData.head = head;
    return root;
  }

  function poseDog(root, t, biting) {
    if (root.userData.tail) root.userData.tail.rotation.y = 0.3 + Math.sin(t * 8) * 0.4;
    if (biting && root.userData.head) root.userData.head.position.y = 0.40 + Math.sin(t * 20) * 0.04;
  }

  /* ---- Rakshasa / myth demons (original designs) ---- */
  function makeDemon(kind) {
    const root = new THREE.Group();
    const scale = kind === 0 ? 1.15 : kind === 1 ? 1.0 : 0.9;
    root.scale.setScalar(scale);

    const bodyCol = kind === 0 ? C.demon : kind === 1 ? 0x5a3a6a : 0x6a4a2a;
    const torso = box(0.55, 0.7, 0.35, bodyCol);
    torso.position.y = 1.15;
    root.add(torso);

    const head = box(0.40, 0.38, 0.36, bodyCol);
    head.position.y = 1.72;
    root.add(head);

    /* Horns */
    const h1 = cone(0.08, 0.28, 4, C.horn);
    h1.position.set(-0.14, 2.00, 0);
    h1.rotation.z = 0.35;
    root.add(h1);
    const h2 = h1.clone();
    h2.position.x = 0.14;
    h2.rotation.z = -0.35;
    root.add(h2);

    const eyeL = box(0.08, 0.08, 0.04, C.eye);
    eyeL.position.set(-0.10, 1.75, 0.18);
    root.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.10;
    root.add(eyeR);

    const armL = box(0.16, 0.5, 0.16, bodyCol);
    armL.position.set(-0.40, 1.2, 0);
    root.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.40;
    root.add(armR);

    /* Club / claw weapon */
    const weapon = box(0.12, 0.6, 0.12, C.wood);
    weapon.position.set(0.40, 0.85, 0.2);
    root.add(weapon);

    const legL = box(0.18, 0.55, 0.18, C.demonDark);
    legL.position.set(-0.14, 0.4, 0);
    root.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.14;
    root.add(legR);

    if (kind === 2) {
      /* Extra tusks for variety */
      const tusk = cone(0.05, 0.18, 4, C.horn);
      tusk.position.set(-0.12, 1.55, 0.2);
      tusk.rotation.x = 1.2;
      root.add(tusk);
      const tusk2 = tusk.clone();
      tusk2.position.x = 0.12;
      root.add(tusk2);
    }

    root.userData.arms = [armL, armR];
    root.userData.legs = [legL, legR];
    root.userData.weapon = weapon;
    root.userData.kind = kind;
    return root;
  }

  function poseDemon(root, t, attacking) {
    const legs = root.userData.legs;
    const arms = root.userData.arms;
    if (legs) {
      const s = Math.sin(t * 6);
      legs[0].rotation.x = s * 0.4;
      legs[1].rotation.x = -s * 0.4;
    }
    if (attacking && arms) {
      arms[1].rotation.x = -1.2 + Math.sin(t * 14) * 0.3;
    } else if (arms) {
      arms[0].rotation.x = Math.sin(t * 3) * 0.2;
      arms[1].rotation.x = -Math.sin(t * 3) * 0.2;
    }
  }

  /* ---- Shami tree (centerpiece) ---- */
  function makeShamiTree() {
    const root = new THREE.Group();
    const trunk = cyl(0.35, 0.5, 2.4, 6, C.bark);
    trunk.position.y = 1.2;
    root.add(trunk);
    /* Gnarled branch */
    const br = cyl(0.12, 0.18, 1.6, 5, C.bark);
    br.position.set(0.6, 2.2, 0);
    br.rotation.z = -1.0;
    root.add(br);
    const br2 = cyl(0.10, 0.14, 1.2, 5, C.bark);
    br2.position.set(-0.5, 2.4, 0.3);
    br2.rotation.z = 0.9;
    root.add(br2);
    /* Leaf clusters (low-poly blobs) */
    const spots = [
      [0, 3.0, 0, 1.4], [0.9, 2.7, 0.2, 1.0], [-0.8, 2.8, -0.2, 1.0],
      [0.3, 3.3, -0.5, 0.9], [-0.4, 3.2, 0.5, 0.85], [1.2, 2.4, 0, 0.7],
    ];
    spots.forEach(([x, y, z, r], i) => {
      const leaf = sph(r, 5, i % 2 ? C.leaf : C.leafLite);
      leaf.position.set(x, y, z);
      root.add(leaf);
    });
    return root;
  }

  /* ---- Temple ruin pieces ---- */
  function makeRuinPillar() {
    const g = new THREE.Group();
    const col = cyl(0.28, 0.32, 2.2, 6, C.stone);
    col.position.y = 1.1;
    g.add(col);
    const cap = box(0.7, 0.2, 0.7, C.stone);
    cap.position.y = 2.25;
    g.add(cap);
    const base = box(0.7, 0.18, 0.7, C.stone);
    base.position.y = 0.09;
    g.add(base);
    /* Moss patches */
    const moss = box(0.3, 0.5, 0.05, C.moss);
    moss.position.set(0.3, 1.2, 0);
    g.add(moss);
    return g;
  }

  function makeRuinWall() {
    const g = new THREE.Group();
    const wall = box(2.4, 1.4, 0.35, C.stone);
    wall.position.y = 0.7;
    g.add(wall);
    const broke = box(0.8, 0.6, 0.35, C.stone);
    broke.position.set(1.0, 1.5, 0);
    broke.rotation.z = -0.25;
    g.add(broke);
    return g;
  }

  function makeGround() {
    const g = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(TUNING.arenaRadius + 1, 16),
      mat(C.ground)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    g.add(floor);
    /* Dirt ring near center */
    const dirt = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 4.5, 12),
      mat(C.dirt)
    );
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.y = 0.01;
    g.add(dirt);
    return g;
  }

  function makeTreeBorder(n) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = TUNING.arenaRadius + 1.5 + (i % 3) * 0.6;
      const t = new THREE.Group();
      const tr = cyl(0.2 + (i % 3) * 0.05, 0.28, 1.8 + (i % 4) * 0.3, 5, C.bark);
      tr.position.y = 0.9;
      t.add(tr);
      const top = sph(0.9 + (i % 3) * 0.15, 5, i % 2 ? C.leaf : C.leafLite);
      top.position.y = 2.2;
      t.add(top);
      t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      g.add(t);
    }
    return g;
  }

  return {
    makeVel, poseVel, makeDog, poseDog, makeDemon, poseDemon,
    makeShamiTree, makeRuinPillar, makeRuinWall, makeGround, makeTreeBorder, C,
  };
})();
