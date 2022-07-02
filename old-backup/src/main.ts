import CreepManager, { DONE, ROLE } from "creep.manager";
import { CachedType } from "creep.target";

declare global {
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
  }

  interface CreepMemory {
    role: string;
    room: string;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

const findTarget = function (screep: Creep, tries = 0): void {
  if (tries > 2) return;

  const creep = new CachedType(screep.id);

  if (creep.getUsedCapacity() === 0) {
    screep.memory.pickup = true;
  } else if (creep.getFreeCapacity() === 0) {
    screep.memory.pickup = false;
  }

  if (!screep.memory.target) {
    if (screep.memory.pickup) {
      const source = screep.pos.findClosestByRange(FIND_SOURCES_ACTIVE, {
        filter: s => new CachedType(s).hasPositionsAvailable()
      });

      if (source) {
        screep.memory.target = source.id;
        screep.memory.job = "harvest";
      }
    } else {
      const spawn = screep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: s =>
          (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
          s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      });

      if (spawn) {
        screep.memory.target = spawn.id;
        screep.memory.job = "transfer";
      }

      if (!screep.memory.target) {
        const construct = screep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES);

        if (construct) {
          screep.memory.target = construct.id;
          screep.memory.job = "construct";
        }
      }
    }
  }

  if (screep.memory.target) {
    const target = new CachedType(screep.memory.target);
    console.log("creep target:", JSON.stringify(target));

    if (!target.isValid()) {
      delete screep.memory.target;
      delete screep.memory.job;

      findTarget(screep, tries + 1);
      return;
    }

    if (screep.memory.job === "harvest") {
      const harvest = CreepManager.harvest(creep, target);
      console.log("harvest:", harvest, "target:", JSON.stringify(target));

      if (harvest === DONE) {
        delete screep.memory.target;
        delete screep.memory.job;

        findTarget(screep, tries + 1);
        return;
      }
    } else if (screep.memory.job === "transfer") {
      const transfer = CreepManager.transfer(creep, target);
      console.log("transfer:", transfer);

      if (transfer === ERR_FULL) {
        screep.drop(RESOURCE_ENERGY);
      }

      if (transfer === ERR_FULL || transfer === OK || transfer === DONE) {
        delete screep.memory.target;
        delete screep.memory.job;

        findTarget(screep, tries + 1);
        return;
      }
    }
  }
};

export const loop = function (): void {
  console.log("-------------", Game.time, "--------------");

  if (!Memory.CachedTypes) Memory.CachedTypes = {};

  const creeps = Object.values(Game.creeps);

  if (creeps.length < 4) {
    Game.spawns.Spawn1.spawnCreep([MOVE, MOVE, CARRY, WORK], "w" + String(Math.ceil(Math.random() * 10)), {
      memory: {
        role: ROLE.WORKER,
        pickup: true
      }
    });
  }

  creeps.forEach(screep => {
    if (screep.spawning) return;

    findTarget(screep);
  });

  creeps.forEach(screep => {
    if (!Memory.CachedTypes[screep.id]) return;
    delete Memory.CachedTypes[screep.id].state;
  });

  Object.values(Memory.CachedTypes).forEach((c: CachedTypeData) => {
    if (Game.rooms[c.pos.roomName]) {
      delete Memory.CachedTypes[c.id];
    }
  });
};
