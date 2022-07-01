import { assigned, assignedCapacity, assignedToType, cache, partsCost, walkablePositions } from "utils";

export enum MyCreepRole {
  HARVESTER = "h",
  MULE = "m",
  UPGRADER = "u"
}

export enum MyCreepJob {
  HARVEST = "h",
  HARVEST_FT = "hft",
  TRANSFERS = "t",
  UPGRADE_CONTROLLER = "uc",
  PICKUP = "p",
  PICKUP_HARVESTER = "ph",
  TRANSFER_TO_UPGRADER = "tc",
  CONSTRUCT = "c",
  PICKUP_TOMBS = "pt",
  TRANSFER_STORAGE = "ts",
  PICKUP_STORAGE = "ps",
  REPAIR = "r"
}

export enum MyRequirement {
  NOT_FULL,
  TARGET_NOT_FULL,
  HAS_ENERGY,
  TARGET_HAS_ENERGY,
  TARGET_NOT_OVER_ASSIGNED,
  CONTROLLER_PRESENT,
  TARGET_NOT_LAST,
  CAN_WORK,
  CAN_CARRY,
  NEAREST_SOURCE,
  ROOM_HAS_TOMBS,
  IS_PICKUP_MODE,
  NOT_PICKUP_MODE,
  TARGET_NEEDS_REPAIRED,
  TARGET_RANGE_OF_CONTROLLER
}

// ----------------------------------------
// █▀█ █▀▀ █▀█ █ █ █ █▀█ █▀▀ █▀▄▀█ █▀▀ █▄ █ ▀█▀ █▀
// █▀▄ ██▄ ▀▀█ █▄█ █ █▀▄ ██▄ █ ▀ █ ██▄ █ ▀█  █  ▄█
// ----------------------------------------

export const JobRequirements = {
  [MyRequirement.NOT_FULL]: {
    check: creep => creep.hasCarry() && creep.getFreeCapacity() > 15
  },
  [MyRequirement.TARGET_NOT_FULL]: {
    target: true,
    check: (creep, target: MyStorageTypes) => target.getFreeCapacity() > (target instanceof Creep ? 15 : 0)
  },
  [MyRequirement.HAS_ENERGY]: {
    check: creep => creep.hasCarry() && creep.getUsedCapacity(RESOURCE_ENERGY) > 0
  },
  [MyRequirement.TARGET_HAS_ENERGY]: {
    target: true,
    check: (creep, target: MyStorageTypes) => target.getUsedCapacity(RESOURCE_ENERGY) > 0
  },
  [MyRequirement.TARGET_NOT_OVER_ASSIGNED]: {
    target: true,
    check: (creep, target) => {
      if (target instanceof Source) {
        return assigned(target, creep).length < walkablePositions(target);
      }

      if (target instanceof Creep) {
        return target.getUsedCapacity() > assignedCapacity(target, creep);
      }

      if (target instanceof Resource) {
        return target.getUsedCapacity() > assignedCapacity(target, creep);
      }

      if (target instanceof StructureExtension) {
        return assignedToType(STRUCTURE_EXTENSION, creep) < 2;
      }

      if (target instanceof Tombstone) {
        return target.getUsedCapacity(RESOURCE_ENERGY) > assignedCapacity(target, creep);
      }

      if (
        target instanceof StructureSpawn ||
        target instanceof StructureContainer ||
        target instanceof StructureTower
      ) {
        return target.getFreeCapacity() > assignedCapacity(target, creep);
      }

      return true;
    }
  },
  [MyRequirement.CONTROLLER_PRESENT]: {
    check: creep => creep.room.controller !== undefined
  },
  [MyRequirement.TARGET_NOT_LAST]: {
    target: true,
    check: (creep, target) => {
      // if (target instanceof Creep && _.filter(Game.creeps, c => c.memory.role === target.memory.role).length === 1)
      //   return true;

      return creep.memory.lastTarget && target && creep.memory.lastTarget !== target.id;
    }
  },
  [MyRequirement.CAN_WORK]: {
    check: creep => creep.hasWork()
  },
  [MyRequirement.CAN_CARRY]: {
    check: creep => creep.hasCarry()
  },
  [MyRequirement.NEAREST_SOURCE]: {
    target: true,
    check: (creep, target: Source) => {
      const spawn = target.room.spawn();
      if (!spawn) return true;

      const closest = spawn.closetActiveSource();
      if (!closest) return false;

      if (closest === target) return true;

      return assigned(target, creep).length < walkablePositions(target);
    }
  },
  [MyRequirement.ROOM_HAS_TOMBS]: {
    check: creep => creep.room.memory.totalTombstones > 0
  },
  [MyRequirement.IS_PICKUP_MODE]: {
    check: creep => cache.mode[creep.id]
  },
  [MyRequirement.NOT_PICKUP_MODE]: {
    check: creep => !cache.mode[creep.id]
  },
  [MyRequirement.TARGET_NEEDS_REPAIRED]: {
    target: true,
    check: (creep, target: MyRepairTypes) => target.hitsMax > target.hits
  },
  [MyRequirement.TARGET_RANGE_OF_CONTROLLER]: {
    target: true,
    check: (creep, target: MyFindTypes) =>
      target && target.room && target.room.controller && target.pos.getRangeTo(target.room.controller) <= 6
  }
} as MyJobRequirements;

// ----------------------------------------
//   █ █▀█ █▄▄ █▀
// █▄█ █▄█ █▄█ ▄█
// ----------------------------------------

const ERR_DONE: ERR_DONE = -20;

export const Jobs = {
  [MyCreepJob.HARVEST]: {
    requirements: [
      MyRequirement.NOT_FULL,
      MyRequirement.CAN_WORK,
      // MyRequirement.NEAREST_SOURCE,
      MyRequirement.TARGET_NOT_OVER_ASSIGNED
    ],
    find: () => FIND_SOURCES_ACTIVE,
    sortBy: (creep, targets) => {
      const spawn = creep.room.spawn();
      if (!spawn) return _.sortBy(targets, tar => creep.pos.getRangeTo(tar));
      return _.sortBy(targets, tar => tar.pos.getRangeTo(spawn));
    },
    doRun: (creep, target: Source) =>
      ([
        ERR_DONE,
        ERR_TIRED,
        ERR_NO_BODYPART,
        ERR_INVALID_TARGET,
        ERR_NOT_ENOUGH_RESOURCES
      ] as MyReturnCodes[]).includes(creep.harvest2(target))
  },
  [MyCreepJob.HARVEST_FT]: {
    requirements: [MyRequirement.NEAREST_SOURCE, MyRequirement.TARGET_NOT_OVER_ASSIGNED],
    find: creep =>
      creep.room.find(FIND_SOURCES_ACTIVE, {
        filter: s => assigned(s, creep).length < walkablePositions(s)
      }),
    sortBy: (creep, targets: Source[]) => {
      const spawn = creep.room.spawn();
      if (!spawn) return _.sortBy(targets, tar => creep.pos.getRangeTo(tar));
      return _.sortBy(targets, tar => tar.pos.getRangeTo(spawn));
    },
    doRun: (creep, target: Source) => {
      if (
        !creep.getFreeCapacity() &&
        creep.rangeTo(target) === 1 &&
        creep.pos.findInRange(FIND_DROPPED_RESOURCES, 0).reduce((a, r) => r.amount + a, 0) >
          (creep.getUsedCapacity() - 300).clamp(0, 350)
      )
        return;

      return ([ERR_TIRED, ERR_NO_BODYPART, ERR_INVALID_TARGET, ERR_NOT_ENOUGH_RESOURCES] as MyReturnCodes[]).includes(
        creep.harvest2(target)
      );
    }
  },
  [MyCreepJob.TRANSFERS]: {
    requirements: [
      MyRequirement.NOT_PICKUP_MODE,
      MyRequirement.HAS_ENERGY,
      MyRequirement.TARGET_NOT_FULL,
      MyRequirement.TARGET_NOT_OVER_ASSIGNED
    ],
    find: () => FIND_STRUCTURES,
    filter: (target: Structure) =>
      ([STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_LAB] as StructureConstant[]).includes(
        target.structureType
      ),
    sortBy: (creep, structures: Structure[]) => _.sortBy(structures, s => creep.rangeTo(s)),
    doRun: (creep, target: MyTransferTypes) =>
      ([
        ERR_DONE,
        ERR_TIRED,
        ERR_NO_BODYPART,
        ERR_INVALID_TARGET,
        ERR_NOT_ENOUGH_RESOURCES
      ] as MyReturnCodes[]).includes(creep.transfer2(target))
  },
  [MyCreepJob.TRANSFER_STORAGE]: {
    requirements: [
      MyRequirement.NOT_PICKUP_MODE,
      MyRequirement.HAS_ENERGY,
      MyRequirement.TARGET_NOT_FULL,
      MyRequirement.TARGET_NOT_OVER_ASSIGNED,
      MyRequirement.TARGET_NOT_LAST
    ],
    find: () => FIND_STRUCTURES,
    filter: (target: MyStorageStructures) =>
      ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE] as StructureConstant[]).includes(target.structureType) &&
      target.getFreeCapacity(),
    sortBy: (creep, structures: MyStorageStructures[]) =>
      _.sortBy(structures, s => {
        if (s.getUsedCapacity() < 500 && s.room.controller && s.pos.getRangeTo(s.room.controller) <= 5) return -1;
        return s.getUsedCapacity();
      }),
    doRun: (creep, target: MyTransferTypes) =>
      ([
        ERR_DONE,
        ERR_TIRED,
        ERR_NO_BODYPART,
        ERR_INVALID_TARGET,
        ERR_NOT_ENOUGH_RESOURCES
      ] as MyReturnCodes[]).includes(creep.transfer2(target))
  },
  [MyCreepJob.TRANSFER_TO_UPGRADER]: {
    requirements: [
      MyRequirement.NOT_PICKUP_MODE,
      MyRequirement.HAS_ENERGY,
      MyRequirement.TARGET_NOT_FULL,
      MyRequirement.TARGET_NOT_LAST,
      MyRequirement.TARGET_RANGE_OF_CONTROLLER
    ],
    find: () => FIND_MY_CREEPS,
    filter: (target: Creep) =>
      target.memory.role === MyCreepRole.UPGRADER &&
      // !target.nearByStructures(STRUCTURE_CONTAINER, 3).length &&
      target.room.controller &&
      target.rangeTo(target.room.controller) <= 4,
    sortBy: (creep, creeps: Creep[]) => _.sortBy(creeps, c => -c.getFreeCapacity()),
    doRun: (creep, target: Creep) =>
      ([OK, ERR_FULL, ERR_INVALID_TARGET, ERR_NOT_ENOUGH_RESOURCES] as MyReturnCodes[]).includes(
        creep.transfer2(target, RESOURCE_ENERGY)
      )
  },
  [MyCreepJob.UPGRADE_CONTROLLER]: {
    requirements: [MyRequirement.NOT_PICKUP_MODE, MyRequirement.HAS_ENERGY, MyRequirement.CAN_WORK],
    find: creep => {
      if (!creep || !creep.room.controller || !creep.room.controller.my) return;
      return [creep.room.controller];
    },
    doRun: (creep, target: StructureController) =>
      ([ERR_NOT_ENOUGH_RESOURCES, ERR_INVALID_TARGET, ERR_NO_BODYPART] as MyReturnCodes[]).includes(
        creep.upgradeController2(target)
      )
  },
  [MyCreepJob.PICKUP]: {
    requirements: [
      MyRequirement.IS_PICKUP_MODE,
      MyRequirement.NOT_FULL,
      MyRequirement.TARGET_HAS_ENERGY,
      MyRequirement.TARGET_NOT_OVER_ASSIGNED
    ],
    find: () => FIND_DROPPED_RESOURCES,
    sortBy: (creep, resources: Resource[]) => _.sortBy(resources, r => creep.rangeTo(r) - r.amount),
    doRun: (creep, target: Resource) =>
      ([ERR_NOT_ENOUGH_RESOURCES, ERR_INVALID_TARGET, ERR_NO_BODYPART] as MyReturnCodes[]).includes(
        creep.pickup2(target)
      )
  },
  [MyCreepJob.PICKUP_TOMBS]: {
    requirements: [
      MyRequirement.IS_PICKUP_MODE,
      MyRequirement.NOT_FULL,
      MyRequirement.ROOM_HAS_TOMBS,
      MyRequirement.TARGET_HAS_ENERGY,
      MyRequirement.TARGET_NOT_OVER_ASSIGNED
    ],
    find: () => FIND_TOMBSTONES,
    sortBy: (creep, resources: Tombstone[]) => _.sortBy(resources, r => creep.rangeTo(r) - r.getUsedCapacity()),
    doRun: (creep, target: Tombstone) =>
      ([ERR_NOT_ENOUGH_RESOURCES, ERR_INVALID_TARGET, ERR_NO_BODYPART] as MyReturnCodes[]).includes(
        creep.withdraw2(target, RESOURCE_ENERGY)
      )
  },
  [MyCreepJob.PICKUP_HARVESTER]: {
    requirements: [
      MyRequirement.IS_PICKUP_MODE,
      MyRequirement.NOT_FULL,
      MyRequirement.TARGET_HAS_ENERGY,
      MyRequirement.TARGET_NOT_OVER_ASSIGNED
    ],
    find: creep =>
      _.filter(
        Game.creeps,
        c =>
          c.my &&
          !c.spawning &&
          c.room === creep.room &&
          c.memory.role === MyCreepRole.HARVESTER &&
          c.getUsedCapacity(RESOURCE_ENERGY) > c.getActiveBodyparts(WORK) * 2
      ),
    doRun: (creep, target: Creep) => {
      if (creep.pos.isNearTo(target)) {
        // if (cache.temp.actions.transfer[target.id] !== OK) {
        const trans = target.transfer(creep, RESOURCE_ENERGY);
        return ([OK, ERR_INVALID_TARGET, ERR_FULL] as MyReturnCodes[]).includes(trans);
        // }
      } else {
        creep.moveTo2(target);
      }

      return false;
    }
  },
  [MyCreepJob.PICKUP_STORAGE]: {
    requirements: [
      MyRequirement.IS_PICKUP_MODE,
      MyRequirement.NOT_FULL,
      MyRequirement.TARGET_HAS_ENERGY,
      MyRequirement.TARGET_NOT_OVER_ASSIGNED,
      MyRequirement.TARGET_NOT_LAST
    ],
    find: () => FIND_STRUCTURES,
    filter: (target: Structure, creep) => {
      if (!([STRUCTURE_CONTAINER, STRUCTURE_STORAGE] as StructureConstant[]).includes(target.structureType))
        return false;

      if (
        creep.memory.role !== MyCreepRole.UPGRADER &&
        target.room.controller &&
        target.pos.getRangeTo(target.room.controller) <= 6
      )
        return false;

      const structures = target.room.find(FIND_STRUCTURES, {
        filter: (s: MyStorageStructures) =>
          ([STRUCTURE_EXTENSION, STRUCTURE_SPAWN] as StructureConstant[]).includes(s.structureType) &&
          s.getFreeCapacity()
      }).length;

      if (creep.memory.role === MyCreepRole.MULE && !structures) {
        const spawn = target.room.spawn();

        if (spawn && target.pos.getRangeTo(spawn) <= 6) {
          return false;
        }
      }

      return true;
    },
    doRun: (creep, target: MyWithdrawTypes) => {
      const result = creep.withdraw2(target, RESOURCE_ENERGY);
      return ([OK, ERR_INVALID_TARGET, ERR_FULL] as MyReturnCodes[]).includes(result);
    }
  },
  [MyCreepJob.CONSTRUCT]: {
    requirements: [MyRequirement.HAS_ENERGY, MyRequirement.CAN_WORK],
    find: () => FIND_MY_CONSTRUCTION_SITES,
    filter(target: ConstructionSite) {
      return assigned(target).length < 2;
    },
    sortBy: (creep, targets: ConstructionSite[]) => _.sortBy(targets, tar => -tar.progress),
    doRun: (creep, target: ConstructionSite) =>
      ([
        ERR_DONE,
        ERR_TIRED,
        ERR_NO_BODYPART,
        ERR_INVALID_TARGET,
        ERR_NOT_ENOUGH_RESOURCES
      ] as MyReturnCodes[]).includes(creep.build2(target))
  },
  [MyCreepJob.REPAIR]: {
    requirements: [
      MyRequirement.CAN_WORK,
      MyRequirement.HAS_ENERGY,
      MyRequirement.TARGET_NEEDS_REPAIRED,
      MyRequirement.TARGET_NOT_OVER_ASSIGNED
    ],
    find: () => FIND_STRUCTURES,
    filter: (target: Structure) =>
      ([
        STRUCTURE_SPAWN,
        STRUCTURE_EXTENSION,
        STRUCTURE_TOWER,
        STRUCTURE_LAB,
        STRUCTURE_ROAD,
        STRUCTURE_CONTAINER
      ] as StructureConstant[]).includes(target.structureType),
    sortBy: (creep, structures: Structure[]) => _.sortBy(structures, s => s.hits),
    doRun: (creep, target: MyRepairTypes) =>
      ([
        ERR_DONE,
        ERR_TIRED,
        ERR_NO_BODYPART,
        ERR_INVALID_TARGET,
        ERR_NOT_ENOUGH_RESOURCES
      ] as MyReturnCodes[]).includes(creep.repair2(target))
  }
} as MyJobs;

// ----------------------------------------
// █▀█ █▀█ █   █▀▀ █▀
// █▀▄ █▄█ █▄▄ ██▄ ▄█
// ----------------------------------------

export const Roles = {
  [MyCreepRole.HARVESTER]: {
    jobs: [MyCreepJob.HARVEST_FT],
    ratio(room) {
      if (room.memory.creepsSpawned[MyCreepRole.MULE] === 0) return 1;

      const energyCapacityAvailable = room.energyCapacityAvailable || 0;

      const activeWorkParts = _.filter(Game.creeps, c => c.memory.role === MyCreepRole.HARVESTER).reduce(
        (n, c) => n + c.getActiveBodyparts(WORK),
        0
      );
      if (activeWorkParts >= 12) return 2;

      return room.memory.totalSourcePositions.clamp(1, energyCapacityAvailable >= 500 ? 4 : 6);
    },
    spawnBody(spawn) {
      const { room } = spawn;
      const energyCapacityAvailable = room.energyCapacityAvailable || 0;

      let body: BodyPartConstant[] = [];

      if (energyCapacityAvailable >= 750) {
        body = [MOVE, MOVE, CARRY, CARRY, WORK, WORK, WORK];

        // let parts = Math.floor(
        //   (energyCapacityAvailable - partsCost(body)) / (BODYPART_COST[MOVE] + BODYPART_COST[CARRY])
        // ).clamp(0, 2);
        // for (let i = 0; parts > 0 && i < parts; i++) {
        //   body.push(MOVE, CARRY);
        // }

        const parts = Math.floor(
          (energyCapacityAvailable - partsCost(body)) /
            (BODYPART_COST[CARRY] + BODYPART_COST[CARRY] + BODYPART_COST[WORK])
        ).clamp(0, 3);

        for (let i = 0; parts > 0 && i < parts; i++) {
          body.push(CARRY, CARRY, WORK);
        }
      } else if (
        (room.memory.creepsSpawned[MyCreepRole.HARVESTER] > 1 || room.energyAvailable >= 500) &&
        energyCapacityAvailable >= 500 &&
        room.memory.creepsSpawned[MyCreepRole.MULE] > 3
      )
        body = [MOVE, CARRY, CARRY, CARRY, WORK, WORK, WORK];
      else if (
        (room.memory.creepsSpawned[MyCreepRole.HARVESTER] > 1 || room.energyAvailable >= 400) &&
        energyCapacityAvailable >= 400 &&
        room.memory.creepsSpawned[MyCreepRole.MULE] > 3
      )
        body = [MOVE, CARRY, CARRY, CARRY, WORK, WORK];
      else if (
        room.memory.creepsSpawned[MyCreepRole.MULE] === 0 ||
        room.memory.creepsSpawned[MyCreepRole.HARVESTER] === 0
      )
        body = [MOVE, CARRY, WORK];
      else body = [MOVE, CARRY, WORK, WORK];

      return body;
    }
  },
  [MyCreepRole.MULE]: {
    jobs: [
      MyCreepJob.CONSTRUCT,
      MyCreepJob.REPAIR,
      MyCreepJob.TRANSFERS,
      MyCreepJob.TRANSFER_TO_UPGRADER,
      MyCreepJob.TRANSFER_STORAGE,
      MyCreepJob.PICKUP_TOMBS,
      MyCreepJob.PICKUP,
      MyCreepJob.PICKUP_HARVESTER,
      MyCreepJob.PICKUP_STORAGE
    ],
    ratio(room) {
      if (room.memory.creepsSpawned[MyCreepRole.HARVESTER] < 2) return 1;

      const activeWorkParts = _.filter(Game.creeps, c => c.memory.role === MyCreepRole.HARVESTER).reduce(
        (n, c) => n + c.getActiveBodyparts(WORK),
        0
      );
      if (activeWorkParts >= 12) return 6;

      return (
        Math.ceil(room.memory.creepsSpawned[MyCreepRole.HARVESTER] * 1.5).clamp(0, 8) +
        Math.floor(room.memory.totalDroppedResources / 1500).clamp(0, 3)
      ).clamp(0, room.memory.totalSourcePositions * 1.5);
    },
    spawnBody(spawn) {
      const { room } = spawn;

      const energyCapacityAvailable = room.energyCapacityAvailable || 0;
      const body = [CARRY, MOVE] as BodyPartConstant[];

      const activeWorkParts = _.filter(Game.creeps, c => c.memory.role === MyCreepRole.MULE).reduce(
        (n, c) => n + c.getActiveBodyparts(WORK),
        0
      );

      if (activeWorkParts === 0 && room.memory.creepsSpawned[MyCreepRole.HARVESTER] >= 3) {
        body.push(WORK, MOVE);
      } else if (room.memory.creepsSpawned[MyCreepRole.HARVESTER] >= 2 && room.memory.totalStructures > 0) {
        body.push(WORK, MOVE);
      } else {
        body.push(CARRY, MOVE);
      }

      // // double the work
      if (energyCapacityAvailable >= 800) {
        body.push(WORK, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE);
      } else if (energyCapacityAvailable >= 700) {
        body.push(WORK, MOVE, MOVE, CARRY, MOVE, CARRY);
      } else if (energyCapacityAvailable >= 500) {
        body.push(WORK, MOVE, CARRY, MOVE);
      } else if (energyCapacityAvailable >= 400) {
        body.push(CARRY, MOVE);
      }

      // if (room.energyAvailable >= 300) {
      //   const parts = Math.floor(
      //     (energyCapacityAvailable - partsCost(body)) / (BODYPART_COST[CARRY] + BODYPART_COST[MOVE])
      //   ).clamp(0, 3);
      //   for (let i = 0; parts > 0 && i < parts; i++) {
      //     body.push(CARRY, MOVE);
      //   }
      // }

      return body;
    }
  },
  [MyCreepRole.UPGRADER]: {
    jobs: [MyCreepJob.UPGRADE_CONTROLLER],
    ratio(room) {
      if (room.memory.creepsSpawned[MyCreepRole.MULE] < 1) return 0;
      if (room.memory.creepsSpawned[MyCreepRole.HARVESTER] < 2) return 0;
      // if (room.memory.totalResources < 500) return 0;

      const freeCap = _.filter(Game.creeps, c => c.memory.role === MyCreepRole.UPGRADER).reduce(
        (n, c) => n + c.getFreeCapacity(),
        0
      );
      if (freeCap >= 100) return 1;

      let base = 2;

      if (!room.memory.constructionSites) base += 1;
      if (room.memory.creepsSpawned[MyCreepRole.MULE] >= 4) base += 1;
      if (room.memory.creepsSpawned[MyCreepRole.HARVESTER] >= 4) base += 1;

      const activeWorkParts = _.filter(Game.creeps, c => c.memory.role === MyCreepRole.UPGRADER).reduce(
        (n, c) => n + c.getActiveBodyparts(WORK),
        0
      );
      if (activeWorkParts >= 10) base -= 3;

      return Math.ceil(room.memory.totalResources / (room.energyCapacityAvailable >= 600 ? 1500 : 450)).clamp(
        base,
        base + 4
      );
    },
    spawnBody(spawn) {
      const { room } = spawn;
      const energyCapacityAvailable = room.energyCapacityAvailable || 0;

      const body = [CARRY, MOVE, WORK, WORK];

      // if (energyCapacityAvailable >= 400) {
      //   body.push(WORK);
      // }

      // if (energyCapacityAvailable >= 700) {
      //   body.push(CARRY, WORK);
      // }

      // if (energyCapacityAvailable >= 1000) {
      //   body.push(CARRY, WORK, WORK);
      // }

      if (energyCapacityAvailable >= 600) {
        const parts =
          (Math.floor((energyCapacityAvailable - partsCost(body)) / (BODYPART_COST[CARRY] + BODYPART_COST[WORK])),
          0,
          3);
        for (let i = 0; parts > 0 && i < parts; i++) {
          body.push(CARRY, WORK);
        }
      }

      return body;
    }
  }
} as MyCreepRoles;
