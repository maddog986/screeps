import { ErrorMapper } from "utils/ErrorMapper";

enum ROLE {
  WORKER = 1
}

enum JOB {
  HARVEST = 1,
  REFILL_SPAWN = 2,
  UPGRADE = 3
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

// actions for our creeps
const actions = {
  // worker creep. first to be spawned
  [ROLE.WORKER]: {
    [JOB.HARVEST]: {
      find: (creep: Creep) => {
        const source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE, {
          filter: s => hasPositionsAvailable(s)
        });

        if (source) {
          creep.memory.target = source.id
        }
      },
      work: (creep: Creep, target: _HasId) => {
        const harvest = creep.harvest(target as Source);

        if (harvest === ERR_NOT_IN_RANGE) {
          creep.moveTo(target as Source)
        }
        // Source is dried up, or creep can no longer store resources
        else if (harvest === ERR_NOT_ENOUGH_RESOURCES || creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
          delete creep.memory.target;
          creep.memory.job = JOB.REFILL_SPAWN
        }
      }
    },
    [JOB.REFILL_SPAWN]: {
      find: (creep: Creep) => {
        const source = creep.pos.findClosestByRange(FIND_MY_SPAWNS, {
          filter: s => hasPositionsAvailable(s) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (source) {
          creep.memory.target = source.id
        } else {
          creep.memory.job = JOB.UPGRADE
        }
      },
      work: (creep: Creep, target: _HasId) => {
        const spawn = target as StructureSpawn
        const work = creep.transfer(spawn, RESOURCE_ENERGY);

        if (work === ERR_NOT_IN_RANGE) {
          creep.moveTo(spawn)
        }
        // no enough resources to REFILL_SPAWN, or target no longer has any room to accept the resources, creep no longer has any resources to REFILL_SPAWN
        else if (work === ERR_NOT_ENOUGH_RESOURCES || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
          delete creep.memory.target;
          creep.memory.job = JOB.HARVEST
        }
        // Spawn is full of resources
        else if (spawn.store.getFreeCapacity() === 0) {
          creep.memory.target = creep.room.controller?.id;
          creep.memory.job = JOB.UPGRADE
        }
      }
    },
    [JOB.UPGRADE]: {
      find: (creep: Creep) => {
          creep.memory.target = creep.room.controller?.id
      },
      work: (creep: Creep, target: _HasId) => {
        const upgrade = creep.upgradeController(target as StructureController);

        if (upgrade === ERR_NOT_IN_RANGE) {
          creep.moveTo(target as StructureController)
        } else if (upgrade === ERR_NOT_ENOUGH_RESOURCES) {
          delete creep.memory.target;
          creep.memory.job = JOB.HARVEST
        } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
          delete creep.memory.target;
          creep.memory.job = JOB.HARVEST
        }
      }
    },
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
          // grab all the creeps spawned by this room
          const creeps = Object.values(Game.creeps).filter(creep => creep.memory.room === roomName);

          // for starters, lets get at least 5 creeps spawned in this room
          if (creeps.length < 5) {
            // spawn a basic worker creep
            spawn.spawnCreep([MOVE, MOVE, CARRY, WORK], "w" + String(Math.ceil(Math.random() * 10)), {
              // default creep memory
              memory: {
                role: ROLE.WORKER,  // role of the new creep
                room: roomName     // home room of the creep (used much later in the game)
              }
            });
          }
        }
      }
    })

    // looping through all the creeps to figure out what each one needs to do
    Object.entries(Game.creeps).forEach(([creepName, creep]) => {
      // debug
      // console.log('creepName:', creepName, "memory:", JSON.stringify(creep.memory));

      const role = creep.memory.role || ROLE.WORKER;
      const creepActions = actions[role] || actions[ROLE.WORKER];

      for (const [jName, { find, work }] of Object.entries(creepActions)) {
        const jobName = Number(jName) as JOB
        const creepJobName = creep.memory.job as JOB;

        // debug
        // console.log(creep.name, 'creepJobName:', creepJobName, "jobName:", jobName, "match?", creepJobName === jobName)

        if (!creepJobName || creepJobName === jobName) {
            // find a target
          if (!creep.memory.target) {
            find(creep)
          }

          let target = getTarget(creep.memory.target)

          if (target) {
            work(creep, target)

            break // dont run anymore jobs
          }
        }
      }
    })
  });
