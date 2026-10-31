'use strict';
/* All tweakable numbers in plain English. Change these, refresh the page. */
const TUNING = {
  /* Internal render size (PS1-ish). Scaled up with nearest filtering. */
  internalWidth: 320,
  internalHeight: 240,

  /* How strong the vertex "wobble" looks (PS1 affine/jitter feel). 0 = off. */
  vertexJitter: 0.012,

  /* Snap vertices to a coarse grid (PS1-like precision). Smaller = chunkier. */
  vertexSnap: 0.08,

  /* Fog: colour and distances where fog starts / fully covers. */
  fogColor: 0xb8c8a8,
  fogNear: 8,
  fogFar: 28,

  /* Camera chase: how far behind / above Vel, and how smoothly it follows. */
  camDistance: 6.5,
  camHeight: 3.2,
  camLerp: 0.08,
  camLookHeight: 1.1,

  /* Vel movement and combat. */
  velSpeed: 4.2,
  velTurnSpeed: 10,
  velMaxHp: 5,
  attackCooldown: 0.45,
  attackDuration: 0.32,
  attackRange: 1.6,
  attackDamage: 1,
  blockDamageReduce: 0.75,
  invulnTime: 0.9,
  knockbackForce: 3.5,

  /* Dog companion. */
  dogFollowDist: 1.8,
  dogSpeed: 5.5,
  dogBiteCooldown: 2.8,
  dogBiteDamage: 1,
  dogBarkInterval: 4.5,

  /* Enemies. */
  enemySpeed: 1.6,
  enemyAttackRange: 1.4,
  enemyAttackCooldown: 1.4,
  enemyDamage: 1,
  enemyHp: 3,
  enemyAggroRange: 14,
  enemyCount: 3,

  /* Arena size (half-width of the clearing). */
  arenaRadius: 14,

  /* Audio master volumes (0–1). Music is optional and quiet. */
  sfxVolume: 0.35,
  musicVolume: 0.08,
  musicEnabled: true,
};
