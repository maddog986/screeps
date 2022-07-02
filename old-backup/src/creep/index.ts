import { Traveler, TravelToOptions } from "utils/Traveler";
import { CONFIG } from "../config";
import { cache, ERR_DONE, oppositeDirection, rangeTo, RoomType, roomType } from "../utils";
import { MyCreepRole } from "./jobs";

// directions to use when searching for room exists
const directions = [FIND_EXIT_TOP, FIND_EXIT_RIGHT, FIND_EXIT_BOTTOM, FIND_EXIT_LEFT];

Creep.prototype.findRandomRoomExit = function () {
  // start with a random
  if (!this.memory.dir) {
    this.memory.dir = _.sample(directions);
  }

  // get room exists
  const exits = Game.map.describeExits(this.room.name);

  // backwards direction
  const backwardsDirection = oppositeDirection(this.memory.dir);

  // console.log(this.name, this.room.name, 'exits:', JSON.stringify(exits),
  //     'dir:', this.memory.dir,
  //     'backwardsDirection:', backwardsDirection)

  // filter rooms
  const filter = (roomName: string, dir: number) =>
    dir !== backwardsDirection &&
    !Memory.rooms[roomName] &&
    !Game.rooms[roomName] &&
    // !Memory.territory.avoid.includes(roomName) &&
    !([RoomType.CORE, RoomType.SOURCEKEEPER, RoomType.ALLEY] as RoomType[]).includes(
      roomType(roomName) || RoomType.CONTROLLER
    );

  const totalExists = _.filter(exits, filter).length;

  // randomize the exit direction
  for (const dir of _.shuffle([FIND_EXIT_TOP, FIND_EXIT_RIGHT, FIND_EXIT_BOTTOM, FIND_EXIT_LEFT])) {
    // get froom name for the exit
    const roomName = exits[dir];
    if (!roomName) {
      return;
    }

    // console.log(this.name, this.room.name, 'checking dir:', dir)

    // dont go backwards if we cant help it
    if (dir === backwardsDirection && totalExists > 1) {
      // console.log(this.name, this.room.name, 'dont go backwards.', dir)
      return;
    }

    if (_.filter(exits, filter).length > 1 && Game.rooms[roomName]) {
      // console.log(this.name, this.room.name, 'dont go into a known room.', roomName)
      return;
    }

    // avoid this room
    if (Memory.territory.avoid.includes(roomName)) {
      // console.log(this.name, this.room.name, 'avoid this room:', roomName)
      return;
    }

    // add bad rooms to avoid list
    if (([RoomType.CORE, RoomType.SOURCEKEEPER] as RoomType[]).includes(roomType(roomName) || RoomType.CONTROLLER)) {
      Memory.territory.avoid.push(roomName);
      // console.log(this.name, this.room.name, 'roomName is bad:', roomType(roomName))
      return;
    }

    // dont revisit a room if possible
    if (totalExists && Memory.rooms[roomName]) {
      // console.log(this.name, this.room.name, 'room already visited.', roomName)
      return;
    }

    // add bad rooms to avoid list
    if (RoomType.ALLEY === roomType(roomName) && totalExists > 1) {
      // console.log(this.name, this.room.name, 'avoid the alley:', roomName)
      return;
    }

    // find exit to the exit
    const exit = this.room.findExitTo(roomName);
    if (exit === ERR_NO_PATH || exit === ERR_INVALID_ARGS) {
      // console.log(this.name, this.room.name, 'exit invalid', roomName)
      return;
    }

    // find closest exit
    const exitPos = this.pos.findClosestByPath(exit, {
      ignoreCreeps: true,
      ignoreRoads: true,
      plainCost: 1,
      swampCost: 1
    });

    if (!exitPos) {
      // console.log(this.name, this.room.name, 'no path to exit.', roomName)
      return;
    }

    this.memory.dir = dir;
    this.memory.targetRoom = roomName;

    console.log(this.name, this.room.name, "dir:", this.memory.dir, "targetRoom:", roomName);

    return exitPos;
  }

  return undefined;
};

Creep.prototype.hasWork = function (): boolean {
  if (!cache.temp.body.work[this.id]) {
    cache.temp.body.work[this.id] = this.getActiveBodyparts(WORK) > 0;
  }

  return cache.temp.body.work[this.id];
};

Creep.prototype.hasMove = function (): boolean {
  if (!cache.temp.body.move[this.id]) {
    cache.temp.body.move[this.id] = this.getActiveBodyparts(MOVE) > 0;
  }

  return cache.temp.body.move[this.id];
};

Creep.prototype.hasCarry = function (): boolean {
  if (!cache.temp.body.carry[this.id]) {
    cache.temp.body.carry[this.id] = this.getActiveBodyparts(CARRY) > 0;
  }

  return cache.temp.body.carry[this.id];
};

Creep.prototype.hasHeal = function (): boolean {
  if (!cache.temp.body.heal[this.id]) {
    cache.temp.body.heal[this.id] = this.getActiveBodyparts(HEAL) > 0;
  }

  return cache.temp.body.heal[this.id];
};

Creep.prototype.hasClaim = function (): boolean {
  if (!cache.temp.body.claim[this.id]) {
    cache.temp.body.claim[this.id] = this.getActiveBodyparts(CLAIM) > 0;
  }

  return cache.temp.body.claim[this.id];
};

Creep.prototype.canWork = function (): boolean {
  return cache.temp.actions.worked[this.id] !== OK;
};

Creep.prototype.canTransfer = function (): boolean {
  return cache.temp.actions.transfer[this.id] !== OK;
};

Creep.prototype.getBoostedParts = function (type: BodyPartConstant): number {
  let count = 0;
  for (let i = this.body.length - 1; i >= 0; i--) {
    if (this.body[i].type === type && this.body[i].boost) count++;
  }
  return count;
};

// Creep.prototype.getNextRoom = function (): ExitConstant {
//   if (!cache.dir[this.id]) {
//     cache.dir[this.id] = _.random(1, 8) as DirectionConstant;
//   }

//   const startDirection = _.random(1, 4) * 2;
//   const exits = Game.map.describeExits(this.room.name);
//   const backwardsDirection = oppositeDirection(cache.dir[this.id]);

//   for (let i = 1; i < 8; i += 2) {
//     const direction = changeDirection(startDirection, i);

//     // Don't go back
//     if (direction === backwardsDirection) {
//       continue;
//     }

//     const roomName = exits[direction as ExitKey];
//     if (!roomName) {
//       continue;
//     }

//     const exit = this.room.findExitTo(roomName);
//     if (exit === -2) {
//       continue;
//     }

//     const exitTo = this.pos.findClosestByPath(exit as ExitConstant, {
//       ignoreCreeps: true
//     });

//     if (!exitTo) {
//       continue;
//     }

//     // avoid room if we can
//     if (Memory.territory.avoid.includes(roomName) && exits > 1) {
//       continue;
//     }

//     // // avoid
//     // // see if the room is OK to use
//     // if (roomType(roomName) === RoomType.SOURCEKEEPER) {
//     //     continue
//     // }

//     cache.dir[this.id] = direction;

//     break;
//   }

//   return cache.dir[this.id] as ExitConstant;
// };

Creep.prototype.clearTarget = function () {
  // clear target
  delete this.memory.target;
  delete this.memory.action;
};

// ------------------------------
// Improve primary functions
// ------------------------------
Creep.prototype.moveTo2 = function (target) {
  if (!target) {
    return ERR_INVALID_TARGET;
  }
  if (!this.hasMove()) {
    return ERR_NO_BODYPART;
  }
  if (cache.temp.actions.moved[this.id] === OK) {
    // console.log("alread moved");
    return ERR_BUSY;
  }

  // if (!Cache.obstacles) {
  //     Cache.obstacles = {}
  // }

  // if (!Cache.obstacles[this.room.name] || CONFIG.MainRoomName === 'sim') {
  //     Cache.obstacles[this.room.name] = []

  //     // _.forEach(this.room.find(FIND_MY_SPAWNS), spawn => {
  //     //     [TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT].forEach(dir => {
  //     //         Cache.obstacles[this.room.name].push({ pos: spawn.pos.getPositionAtDirection(dir) })
  //     //     })
  //     // })

  //     _.forEach(this.room.find(FIND_MY_CREEPS), creep => {
  //         let add = false

  //         if (creep.target instanceof StructureController && creep.rangeTo(creep.target) <= 3) {
  //             add = true
  //         }

  //         if (creep.target instanceof Source && creep.rangeTo(creep.target) <= 1) {
  //             add = true
  //         }

  //         if (add) {
  //             Cache.obstacles[this.room.name].push({ pos: creep.pos })
  //         }
  //     })

  //     delete this.room.memory.avoid
  // }

  // https://github.com/bonzaiferroni/Traveler/wiki/Traveler-API
  const opts = {
    maxOps: 1000,
    // freshMatrix: CONFIG.MainRoomName === 'sim',
    movingTarget: target instanceof Creep && (!target.my || target.hasMove()),
    // obstacles: Cache.obstacles[this.room.name].filter(o => !this.target.id || o.id !== this.target.id),
    offRoad: this.body.length === 1 && this.getActiveBodyparts(MOVE)
    // things to avoid
    // obstacles: Cache.obstacles[this.room.name]
  } as TravelToOptions;

  // profiler.start('moveTo2', this)

  // const cpu = Game.cpu.getUsed();

  // console.log(this.pos.find)

  if (target instanceof Source || target instanceof Creep) {
    opts.range = 1;
  } else if (target instanceof StructureController || target instanceof ConstructionSite) {
    opts.range = 3;
  }

  opts.obstacles = _.filter(
    Game.creeps,
    c =>
      (c.memory.role === MyCreepRole.HARVESTER && c !== this && c.memory.target && c.rangeTo(c.memory.target) === 1) ||
      (c.memory.role === MyCreepRole.UPGRADER && c !== this && c.memory.target && c.rangeTo(c.memory.target) <= 3)
  ).map(c => ({ pos: c.pos }));

  // const moved = this.moveTo(target, opts);
  const moved = Traveler.travelTo(this, target, opts);
  // console.log("moved:", moved);

  // this.log(`moved: ${Game.cpu.getUsed() - cpu}`);

  // profiler.end('moveTo2', this)

  if (moved === OK) {
    // reset range checks
    // this.memory.resetRange = Game.time + 1;

    return (cache.temp.actions.moved[this.id] = moved);
  }

  return moved;
};

Creep.prototype.move2 = function (direction) {
  if (cache.temp.actions.moved[this.id] === OK) return ERR_BUSY;

  // profiler.start('move2', this)

  const moved = this.move(direction);

  // profiler.end('move2', this)

  if (moved === OK) {
    // reset range checks
    // this.memory.resetRange = true;

    return (cache.temp.actions.moved[this.id] = moved);
  }

  return moved;
};

Creep.prototype.pickup2 = function (target: Resource) {
  // verify target
  if (!target || !(target instanceof Resource) || !target.resourceType) {
    return ERR_INVALID_TARGET;
  }

  const actionRange = 1;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.transfer[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  // pickup the target
  let transfer = this.pickup(target);

  // needed because we want creep to drop off and try to pickup resources in same tick
  if (transfer === ERR_FULL && this.getFreeCapacity() > 0) {
    // have to wait until next tick to pickup
    transfer = ERR_BUSY;
  }
  // transfer success
  else if (transfer === OK) {
    const amount = target.amount.clamp(0, target.amount).clamp(0, this.getFreeCapacity());

    // record the pickup
    this.addTransfer(target.resourceType, amount);

    // substract what we just took
    target.addTransfer(target.resourceType, -amount);

    // save and return OK
    return (cache.temp.actions.transfer[this.id] = transfer);
  }

  return transfer;
};

Creep.prototype.transfer2 = function (target, resource = RESOURCE_ENERGY, amount) {
  // verify target
  if (!target || target instanceof Resource || target instanceof Tombstone) {
    return ERR_INVALID_TARGET;
  }

  // have to wait until next tick to use resources
  if (!this.getUsedCapacity(resource)) {
    return ERR_NOT_ENOUGH_RESOURCES;
  }

  const actionRange = 1;

  // move closer to target
  if (target.room !== this.room || rangeTo(this, target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.transfer[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  if (!amount) {
    amount = Math.min(this.store.getUsedCapacity(resource), this.getUsedCapacity(resource));
  }

  // make sure we set a max on transfer
  amount = amount.clamp(
    0,
    Math.min(
      target instanceof StructureSpawn || target instanceof StructureTower
        ? target.store.getFreeCapacity(RESOURCE_ENERGY)
        : target.store.getFreeCapacity(),
      target.getFreeCapacity()
    )
  );

  let transfer = this.transfer(target, resource, amount);

  // have to wait until next tick to use resources
  if (transfer === ERR_NOT_ENOUGH_RESOURCES && this.getUsedCapacity(RESOURCE_ENERGY)) {
    transfer = ERR_BUSY;
  }

  // transfer says target is full, but we know its not
  else if (transfer === ERR_FULL && target.getFreeCapacity()) {
    transfer = ERR_BUSY;
  } else if (transfer === OK) {
    this.addTransfer(resource, -amount);
    target.addTransfer(resource, amount);

    // save and return OK
    return (cache.temp.actions.transfer[this.id] = transfer);
  }

  return transfer;
};

Creep.prototype.withdraw2 = function (target, resource = RESOURCE_ENERGY, amount = 1000000) {
  // verify target
  if (!target || target instanceof StructureSpawn) {
    return ERR_INVALID_TARGET;
  }

  if (!target.getUsedCapacity(resource)) {
    return ERR_NOT_ENOUGH_RESOURCES;
  }

  const actionRange = 1;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.transfer[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  // clamp withdraw amount to both what the creep can carry and what the storage has left
  amount = amount.clamp(0, this.store.getFreeCapacity()).clamp(0, target.store.getUsedCapacity(resource));

  // try to withdraw the resource
  let transfer = this.withdraw(target, resource, amount);

  // have to wait until next tick to use resources
  if (transfer === ERR_NOT_ENOUGH_RESOURCES && target.getUsedCapacity(resource)) {
    transfer = ERR_BUSY;
  }

  // have to wait until next tick
  else if (transfer === ERR_FULL && this.getFreeCapacity()) {
    transfer = ERR_BUSY;
  }

  // success in withdraw
  else if (transfer === OK) {
    this.addTransfer(resource, amount);

    if (target.addTransfer) {
      target.addTransfer(resource, -amount);
    }

    // save and return OK
    return (cache.temp.actions.transfer[this.id] = transfer);
  }

  return transfer;
};

Creep.prototype.drop2 = function (resource = RESOURCE_ENERGY, amount = 1000000, target) {
  // have to wait until next tick to use resources
  if (!this.getUsedCapacity(resource)) {
    return ERR_BUSY;
  }

  if (target) {
    const actionRange = 1;

    // move closer to target
    if (this.rangeTo(target) > actionRange) {
      this.moveTo2(target);
      return ERR_NOT_IN_RANGE; // wait until next tick
    }
    // action already ran this tick, and to close to run action again
    else if (cache.temp.actions.transfer[this.id] === OK && this.rangeTo(target) <= actionRange) {
      return ERR_BUSY; // wait until next tick
    }
  }

  amount = amount.clamp(0, Math.min(this.store.getUsedCapacity(resource), this.getUsedCapacity(RESOURCE_ENERGY)));

  let transfer = this.drop(resource, amount);

  // have to wait until next tick to use resources
  if (transfer === ERR_NOT_ENOUGH_RESOURCES && this.getUsedCapacity(resource)) {
    transfer = ERR_BUSY;
  }

  // dropped ok
  else if (transfer === OK) {
    this.addTransfer(resource, -amount);

    // save and return OK
    return (cache.temp.actions.transfer[this.id] = transfer);
  }

  return transfer;
};

Creep.prototype.build2 = function (target: ConstructionSite) {
  // verify target
  if (!target) {
    return ERR_INVALID_TARGET;
  }

  if (!this.getUsedCapacity(RESOURCE_ENERGY)) {
    return ERR_NOT_ENOUGH_RESOURCES;
  }

  const actionRange = 3;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.worked[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  let work = this.build(target);

  // have to wait until next tick to use resources
  if (work === ERR_NOT_ENOUGH_RESOURCES && this.getUsedCapacity(RESOURCE_ENERGY)) {
    work = ERR_BUSY;
  } else if (work === OK) {
    this.addTransfer(RESOURCE_ENERGY, (this.hasWork() ? 1 : 0) * -5);

    // no energy left
    if (!this.getUsedCapacity(RESOURCE_ENERGY)) {
      cache.temp.actions.worked[this.id] = OK;
      return ERR_DONE;
    }

    return (cache.temp.actions.worked[this.id] = work);
  }

  return work;
};

Creep.prototype.repair2 = function (target: MyRepairTypes) {
  if (!target || target.hits >= target.hitsMax) {
    return ERR_INVALID_TARGET;
  }

  if (!this.getUsedCapacity(RESOURCE_ENERGY)) {
    return ERR_NOT_ENOUGH_RESOURCES;
  }

  const actionRange = 3;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.worked[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  let work = this.repair(target);

  // have to wait until next tick to use resources
  if (work === ERR_NOT_ENOUGH_RESOURCES && this.getUsedCapacity(RESOURCE_ENERGY)) {
    work = ERR_BUSY;
  } else if (work === OK) {
    this.addTransfer(RESOURCE_ENERGY, (this.hasWork() ? 1 : 0) * -5);

    // no energy left
    if (!this.getUsedCapacity(RESOURCE_ENERGY)) {
      cache.temp.actions.worked[this.id] = OK;
      return ERR_DONE;
    }

    return (cache.temp.actions.worked[this.id] = work);
  }

  return (cache.temp.actions.worked[this.id] = work);
};

Creep.prototype.harvest2 = function (target: Source) {
  if (!this.hasWork()) {
    return ERR_NO_BODYPART;
  }

  const actionRange = 1;

  // if (this.name === "h2") console.log(this.name, "harvest range:", this.rangeTo(target));

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.worked[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  // harvest
  const work = this.harvest(target);

  // harvest successfull
  if (work === OK) {
    const startEnergy = ((this.hasWork() ? 1 : 0) * 2).clamp(0, this.store.getFreeCapacity());

    this.addTransfer(RESOURCE_ENERGY, startEnergy);

    // no energy left
    if (!this.getFreeCapacity()) {
      cache.temp.actions.worked[this.id] = OK;
      return ERR_DONE;
    }

    return (cache.temp.actions.worked[this.id] = work);
  }

  return work;
};

Creep.prototype.upgradeController2 = function (target) {
  if (!target || !(target instanceof StructureController) || !target.my) {
    return ERR_INVALID_TARGET;
  }

  if (!this.getUsedCapacity(RESOURCE_ENERGY)) {
    return ERR_NOT_ENOUGH_RESOURCES;
  }

  const actionRange = 3;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.worked[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  let work = this.upgradeController(target);

  // have to wait until next tick to use resources
  if (work === ERR_NOT_ENOUGH_RESOURCES && this.getUsedCapacity(RESOURCE_ENERGY)) {
    work = ERR_BUSY;
  }

  // upgraded sucessfully
  else if (work === OK) {
    this.addTransfer(RESOURCE_ENERGY, -this.hasWork());

    // no energy left
    if (!this.getFreeCapacity()) {
      cache.temp.actions.worked[this.id] = OK;
      return ERR_DONE;
    }

    return (cache.temp.actions.worked[this.id] = work);
  }

  return work;
};

Creep.prototype.signController2 = function (target, text) {
  if (
    !target ||
    !(target instanceof StructureController) ||
    (target.owner && !CONFIG.username.includes(target.owner.username))
  ) {
    return ERR_INVALID_TARGET;
  }

  const actionRange = 1;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.signed[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  const sign = this.signController(target, text);

  if (sign === OK) {
    return (cache.temp.actions.signed[this.id] = sign);
  }

  return sign;
};

Creep.prototype.claimController2 = function (target) {
  if (!this.getActiveBodyparts(CLAIM)) {
    return ERR_NO_BODYPART;
  }

  if (!target || !(target instanceof StructureController) || target.owner) {
    return ERR_INVALID_TARGET;
  }

  const actionRange = 1;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.claimed[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  const claim = this.claimController(target);

  if (claim === OK) {
    return (cache.temp.actions.claimed[this.id] = claim);
  }

  return claim;
};

Creep.prototype.attackController2 = function (target) {
  if (!this.getActiveBodyparts(CLAIM)) {
    return ERR_NO_BODYPART;
  }

  if (!target || !(target instanceof StructureController)) {
    return ERR_INVALID_TARGET;
  }

  const actionRange = 1;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.claimed[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  const claim = this.attackController(target);

  if (claim === OK) {
    return (cache.temp.actions.claimed[this.id] = claim);
  }

  return claim;
};

Creep.prototype.reserveController2 = function (target) {
  if (!this.getActiveBodyparts(CLAIM)) {
    return ERR_NO_BODYPART;
  }

  if (
    !target ||
    !(target instanceof StructureController) ||
    (target.reservation && !CONFIG.username.includes(target.reservation.username))
  )
    return ERR_INVALID_TARGET;

  const actionRange = 1;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > actionRange) {
    this.moveTo2(target);
    return ERR_NOT_IN_RANGE; // wait until next tick
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.claimed[this.id] === OK && this.rangeTo(target) <= actionRange) {
    return ERR_BUSY; // wait until next tick
  }

  const claim = this.reserveController(target);

  if (claim === OK) {
    return (cache.temp.actions.claimed[this.id] = claim);
  }

  return claim;
};

Creep.prototype.attack2 = function (target: Creep) {
  if (!target) {
    return ERR_INVALID_TARGET;
  }

  if (!this.getActiveBodyparts(RANGED_ATTACK) && !this.getActiveBodyparts(ATTACK)) {
    return ERR_NO_BODYPART;
  }

  // can use long ranged heal from 3 ticks away
  // const actionRange = this.getActiveBodyparts(RANGED_ATTACK) ? 3 : 1;

  // action already ran this tick, and to close to run action again
  if (cache.temp.actions.attack[this.id] === OK && this.rangeTo(target) < 1) {
    return ERR_BUSY; // wait until next tick
  }

  return ERR_NOT_IN_RANGE;
};

Creep.prototype.heal2 = function (target: Creep) {
  if (!target) {
    return ERR_INVALID_TARGET;
  }

  if (!this.getActiveBodyparts(HEAL)) {
    return ERR_NO_BODYPART;
  }

  // target does need healed
  if (target.hits === target.hitsMax) {
    return ERR_INVALID_TARGET;
  }

  // target range
  // const actionRange = 1;

  // move closer to target
  if (target.room !== this.room || this.rangeTo(target) > 1) {
    this.moveTo2(target);
  }
  // action already ran this tick, and to close to run action again
  else if (cache.temp.actions.heal[this.id] === OK && this.rangeTo(target) <= 1) {
    return ERR_BUSY; // wait until next tick
  }

  let heal = this.heal(target);

  if (heal === ERR_NOT_IN_RANGE) {
    heal = this.rangedHeal(target);
  }

  if (heal === OK) {
    return (cache.temp.actions.heal[this.id] = heal);
  }

  return heal;
};
