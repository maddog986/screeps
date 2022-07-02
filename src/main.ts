import { ErrorMapper } from "utils/ErrorMapper";
import { ROLE, workers } from "./config";

enum JOB {
  HARVEST = 1,
  REFILL_SPAWN = 2,
  UPGRADE = 3,
  REFILL_CONTAINERS = 4,
  PICKUP_RESOURCES = 5
}

// type Role = ROLE;
// type Job = JOB;

declare global {

  interface Memory {
    uuid: number;
    log: any;
    targets: {
      [name: string]: string | _HasId | undefined
    }
  }

  interface CreepMemory {
    role: ROLE;
    room: string;
    job?: JOB | undefined;
    target?: string;
  }

  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

const creepsAssigned = (target: _HasId & _HasRoomPosition): number => {
  const creeps = Object.values(Game.creeps);

  return creeps.filter(c => c.memory.target === target.id).length;
}

const walkablePositions = (pos: RoomPosition, dist = 1): number => {
  const terrain = Game.map.getRoomTerrain(pos.roomName);

  let spots = 0;

  for (let dx = -dist; dx <= dist; dx += 1) {
    for (let dy = -dist; dy <= dist; dy += 1) {
      if (terrain.get(pos.x + dx, pos.y + dy) === 0) {
        spots++;
      }
    }
  }

  return spots;
}

const hasPositionsAvailable = (target: _HasId & _HasRoomPosition, dist = 1): boolean => {
  return creepsAssigned(target) < walkablePositions(target.pos, dist);
}

const getTarget = <T extends _HasId>(targetId: Id<T> | undefined | string): (_HasId | null | undefined) => {
  if (!targetId) return undefined;

  if (typeof targetId === "string") {
    Memory.targets[targetId] = Game.getObjectById(targetId as Id<T>) as _HasId
    return Memory.targets[targetId] as _HasId;
  }

  return Memory.targets[targetId] as _HasId;
}

const creepMove = (creep: Creep, target: _HasRoomPosition) => {
  creep.moveTo(target, {
    ignoreCreeps: creep.pos.getRangeTo(target) > 3,
    reusePath: 10,
    visualizePathStyle: {
      fill: 'transparent',
      stroke: '#fff',
      lineStyle: 'dashed',
      strokeWidth: .15,
      opacity: .1
    }
  })
}

const jobs = {
  [JOB.HARVEST]: {
    find: (creep: Creep) => {
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        delete creep.memory.target;
        return;
      }

      const source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE, {
        filter: s => hasPositionsAvailable(s)
      });

      if (source) {
        return source.id
      }

      return;
    },
    work: (creep: Creep, target: _HasId) => {
      const harvest = creep.harvest(target as Source);

      if (harvest === ERR_NOT_IN_RANGE) {
       creepMove(creep, target as Source)
      }
      // Source is dried up, or creep can no longer store resources
      else if (harvest === ERR_NOT_ENOUGH_RESOURCES || creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        delete creep.memory.target;
        creep.memory.job = JOB.REFILL_SPAWN
      }

      const container = creep.pos.findInRange(FIND_STRUCTURES, 1).find(s => s.structureType === STRUCTURE_CONTAINER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)

      if (container) {
        creep.transfer(container, RESOURCE_ENERGY)
      }
    }
  },
  [JOB.REFILL_SPAWN]: {
    find: (creep: Creep) => {
      // cant upgrade if creep is empty
      if (!creep.store[RESOURCE_ENERGY]) {
        return;
      }

      // let mules transfer resources
      if (creep.memory.role === ROLE.WORKER && Object.values(Game.creeps).filter(c => c.memory.role === ROLE.MULE).length > 2) {
        return;
      }

      let source = creep.pos.findClosestByRange(FIND_MY_SPAWNS, {
        filter: s => hasPositionsAvailable(s) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      });

      // spawn doesnt need a refill
      if (!source) {
        // find extension that needs a refill
        source = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
          filter: s => s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
      }

      if (source) {
        return source.id
      }

      return;
    },
    work: (creep: Creep, target: _HasId) => {
      const spawn = target as StructureSpawn
      const work = creep.transfer(spawn, RESOURCE_ENERGY);

      if (work === ERR_NOT_IN_RANGE) {
        creepMove(creep, spawn)
      } else {
        delete creep.memory.target
      }
    }
  },
  [JOB.UPGRADE]: {
    find: (creep: Creep) => {
      // cant upgrade if creep is empty
      if (!creep.store[RESOURCE_ENERGY]) {
        return;
      }

      console.log(creep.body)

      return creep.room.controller?.id
    },
    work: (creep: Creep, target: _HasId & _HasRoomPosition) => {
      const upgrade = creep.upgradeController(target as StructureController);

      if (upgrade === ERR_NOT_IN_RANGE) {
        creepMove(creep, target as StructureController)
      } else if (upgrade === ERR_NOT_ENOUGH_ENERGY) {
        delete creep.memory.target;
      } else if (creep.store.getFreeCapacity() > 25) {
        const container = target.pos.findInRange(FIND_STRUCTURES, 5).find(s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0)

        if (container) {
          if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(container)
          }
        }
      }


    }
  },
  [JOB.REFILL_CONTAINERS]: {
    find: (creep: Creep) => {
      // cant transfer if creep is empty
      if (!creep.store[RESOURCE_ENERGY]) {
        return;
      }

      const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 15 && s.room.controller && s.pos.getRangeTo(s.room.controller) <= 5
      })

      if (container) {
        return container.id
      }

      return;
    },
    work: (creep: Creep, target: _HasId) => {
      const container = target as StructureContainer;

      const work = creep.transfer(container, RESOURCE_ENERGY)

      if (work === ERR_NOT_IN_RANGE) {
        creepMove(creep, container)
      } else {
        delete creep.memory.target
      }
    }
  },
  [JOB.PICKUP_RESOURCES]: {
    find: (creep: Creep) => {
      // cant pickup if creep is full
      if (!creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
        delete creep.memory.target
        return;
      }

      const container = creep.room.find(FIND_STRUCTURES)
        .find(s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0 && s.pos.findInRange(FIND_SOURCES, 2).length)

      if (container) {
        return container.id
      }

      const harvesters = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
        filter: c => c.memory.role === ROLE.WORKER && c.store[RESOURCE_ENERGY] > 0
      })

      if (harvesters) {
        return harvesters.id
      }

      return;
    },
    work: (creep: Creep, target: _HasId) => {
      const mules = creep.pos.findInRange(FIND_MY_CREEPS, 1, {
        filter: c => c.memory.role === ROLE.MULE && c.store[RESOURCE_ENERGY] > creep.store[RESOURCE_ENERGY] && c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      })

      if (mules.length) {
        creep.transfer(mules[0], RESOURCE_ENERGY)
      }

      const container = target as StructureContainer;
      const work = container instanceof Creep ? container.transfer(creep, RESOURCE_ENERGY) : creep.withdraw(container, RESOURCE_ENERGY)

      if (work === ERR_NOT_IN_RANGE) {
        creepMove(creep, container)
      } else {
        delete creep.memory.target
      }
    }
  }
}

// actions for our creeps
const actions = {
  // worker creep. first to be spawned
  [ROLE.WORKER]: {
    [JOB.HARVEST]: jobs[JOB.HARVEST],
    [JOB.REFILL_SPAWN]: jobs[JOB.REFILL_SPAWN],
    [JOB.UPGRADE]: jobs[JOB.UPGRADE]
  },
  [ROLE.MULE]: {
    [JOB.REFILL_SPAWN]: jobs[JOB.REFILL_SPAWN],
    [JOB.REFILL_CONTAINERS]: jobs[JOB.REFILL_CONTAINERS],
    [JOB.PICKUP_RESOURCES]: jobs[JOB.PICKUP_RESOURCES]
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  // setup target lookup table
  if (!Memory.targets) Memory.targets = {}

  // loop through rooms
  const rooms = Object.entries(Game.rooms)

  // loop through all rooms
  rooms.forEach(([roomName, room]) => {
    // if Controller present and its mine, we care for spawn controls
    if (room.controller?.my) {
      // TODO: make this work for multiple spawns in one room
      const spawn = Object.values(Game.spawns).find(spawn => spawn.room.name === roomName)

      // spawn preset, lets make creeps if we need them
      if (spawn) {

        const allCreeps = Object.values(Game.creeps)
        if (allCreeps.length >= 10) return; // limit creeps to 10

        for (const [creepName, data] of Object.entries(workers)) {
          // grab all the creeps spawned by this room
          const creeps = allCreeps.filter(({ memory: { role } }) => String(role) === String(creepName));

          // if ratio already meet, bail
          if (creeps.length / allCreeps.length > data.ratio) continue;

          // spawn a the worker creep
          spawn.spawnCreep(data.body, creepName + String(Math.ceil(Math.random() * 10)), {
            // default creep memory
            memory: {
              role: creepName as ROLE,  // role of the new creep
              room: roomName     // home room of the creep (used much later in the game)
            }
          });

          break;
        }
      }
    }
  })

  // looping through all the creeps to figure out what each one needs to do
  Object.entries(Game.creeps).forEach(([creepName, creep]) => {
    // debug
    // console.log('creepName:', creepName, "role:", creep.memory.role);

    const role = creep.memory.role || ROLE.WORKER;
    const creepActions = actions[role] || actions[ROLE.WORKER];

    for (const [jName, { find, work }] of Object.entries(creepActions)) {
      const jobName = Number(jName) as JOB
      const creepJobName = Number(creep.memory.job as JOB);

      // debug
      // console.log(creep.name, 'creepJobName:', creepJobName, "jobName:", jobName, "match?", creepJobName === jobName)

      if (!creepJobName || (creepJobName === jobName)) {
        // find a target
        if (!getTarget(creep.memory.target) || !creepJobName) {
          const targetId = find(creep)

          if (targetId) {
            creep.memory.target = targetId;
            creep.memory.job = jobName;
          } else {
            delete creep.memory.target
            delete creep.memory.job
          }
        }

        let target = getTarget(creep.memory.target)

        if (target) {
          work(creep, target)
        }
      }
    }

  })
});
