import { cache, partsCost, sortParts } from "utils";
import { JobRequirements, Jobs, MyCreepRole, Roles } from "./jobs";

const run = (creep: Creep, tries = 0): void => {
  if (creep.spawning) return;

  if (!creep.getFreeCapacity() && cache.mode[creep.id]) delete cache.mode[creep.id];
  if (!creep.getUsedCapacity()) cache.mode[creep.id] = true;

  if (tries >= 2) return;

  // // if (!Game.spawns.Spawn1.spawning && (creep.ticksToLive || 100) < 50) {
  // //   creep.memory.renew = true;
  // // }
  // if (creep.memory.renew) {
  //   delete creep.memory.renew;
  //   // creep.moveTo(Game.spawns.Spawn1);
  //   // Game.spawns.Spawn1.renewCreep(creep);
  // }

  if (
    !Game.spawns.Spawn1.spawning &&
    creep.room.energyAvailable === creep.room.energyCapacityAvailable &&
    Game.time % (creep.memory.role === MyCreepRole.HARVESTER ? 10 : 80) &&
    _.find(Game.creeps, c => c.my && (c.spawning || c.memory.recycle || c.memory.renew)) === undefined &&
    _.isMatch(creep.room.memory.creepsSpawned, creep.room.memory.creepsToSpawn)
  ) {
    const parts = sortParts(Roles[creep.memory.role].spawnBody(Game.spawns.Spawn1));
    const cost = partsCost(parts);

    // make sure we know how many parts we need to save
    const creepParts = sortParts(creep.body.map(b => b.type));

    // if creep can get more parts, do it!
    if (!_.isMatch(parts, creepParts) && cost <= creep.room.energyAvailable) {
      creep.memory.recycle = true;

      delete creep.memory.renew;

      console.log(creep.name, "should recycle.");
      console.log("   parts :", creepParts);
      console.log("   should:", parts);
      console.log("   cost  :", cost);
    }
  }

  if (creep.memory.recycle) {
    creep.drop(RESOURCE_ENERGY);
    creep.moveTo2(Game.spawns.Spawn1);
    Game.spawns.Spawn1.recycleCreep(creep);
    return;
  }

  // if (creep.hasCarry()) {
  //   const first = _.first(creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1));
  //   if (first) creep.pickup(first);
  // }

  // if (creep.memory.role === MyCreepRole.HARVESTER) {
  //   const cWR = _.first(
  //     creep.pos.findInRange(FIND_MY_CREEPS, 1, {
  //       filter: c => c.memory.role !== MyCreepRole.HARVESTER && c.getFreeCapacity(RESOURCE_ENERGY) > 0
  //     })
  //   );

  //   if (cWR) creep.transfer(cWR, RESOURCE_ENERGY);
  // }

  // console.log(Game.time, creep.name, "run:", tries);

  const role = Roles[creep.memory.role];
  let target: MyFindTypes | undefined;

  if (creep.name === "m1") console.log("----------------\n", Game.time, creep.name, "mode:", cache.mode[creep.id]);

  for (const jobId of role.jobs) {
    if (creep.memory.action && creep.memory.action !== jobId) continue;

    if (!creep.getFreeCapacity()) delete cache.mode[creep.id];
    if (!creep.getUsedCapacity()) cache.mode[creep.id] = true;

    const job = Jobs[jobId];

    target = creep.memory.target ? (Game.getObjectById(creep.memory.target) as MyFindTypes) : undefined;

    if (creep.name === "m1") console.log(Game.time, creep.name, "jobId", jobId, "target:", target);

    if (target && job.requirements) {
      const failedRequirement = job.requirements.find(r => !JobRequirements[r].check(creep, target));

      if (failedRequirement !== undefined) {
        if (creep.name === "m1")
          console.log(
            Game.time,
            creep.name,
            "jobId",
            jobId,
            "target no longer meets requirements. failed:",
            failedRequirement
          );

        creep.memory.lastTarget = creep.memory.target;

        delete creep.memory.target;
        delete creep.memory.action;

        return run(creep, tries + 1);
      }
    }

    if (!target) {
      if (creep.name === "m1") console.log(Game.time, creep.name, "look for target", jobId);

      delete creep.memory.target;
      delete creep.memory.action;

      if (job.requirements) {
        const failedRequirement = job.requirements.find(
          r => !JobRequirements[r].target && !JobRequirements[r].check(creep)
        );

        if (failedRequirement !== undefined) {
          if (creep.name === "m1")
            console.log(
              Game.time,
              creep.name,
              "jobId",
              jobId,
              "doesnt match requirements. failedRequirement:",
              failedRequirement
            );
          continue;
        }
      }

      const findTargets = job.find(creep);

      if (!findTargets) {
        if (creep.name === "m1")
          console.log(Game.time, creep.name, "jobId", jobId, "no targets found. Move to next action.");

        continue;
      }

      let targets: MyFindTypes[];

      if (typeof findTargets === "number") {
        targets = creep.room.find(findTargets) as MyFindTypes[];
      } else {
        targets = findTargets;
      }

      if (creep.name === "m1") console.log(Game.time, creep.name, "jobId", jobId, "findTargets:", findTargets);

      // filters
      if (job.filter) targets = _.filter(targets, t => t && job.filter && job.filter(t, creep));

      if (creep.name === "m1") console.log(Game.time, creep.name, "jobId", jobId, "after filter targets:", targets);

      // requirements
      if (job.requirements) {
        targets = _.filter(
          targets,
          tar =>
            job.requirements &&
            job.requirements.find(r => JobRequirements[r].target && !JobRequirements[r].check(creep, tar)) === undefined
        );

        if (creep.name === "m1")
          console.log(Game.time, creep.name, "jobId", jobId, "after requirements targets:", targets);
      }

      // sort targets
      if (targets.length > 1) {
        targets = job.sortBy ? job.sortBy(creep, targets) : _.sortBy(targets, tar => creep.rangeTo(tar));
      }

      target = _.first(targets);

      if (creep.name === "m1") console.log(Game.time, creep.name, "jobId", jobId, "target:", target);

      if (!target) {
        continue;
      }

      creep.memory.target = target.id;
      creep.memory.action = jobId;
    }

    if (target) {
      if (
        (job.doBeforeRun && job.doBeforeRun(creep, target)) ||
        job.doRun(creep, target) ||
        (job.doAfterRun && job.doAfterRun(creep, target))
      ) {
        if (creep.name === "m1") console.log(Game.time, creep.name, "jobId", jobId, "doRun returned TRUE.");

        creep.memory.lastTarget = creep.memory.target;

        if (!creep.getFreeCapacity()) delete cache.mode[creep.id];
        if (!creep.getUsedCapacity()) cache.mode[creep.id] = true;

        delete creep.memory.target;
        delete creep.memory.action;

        return run(creep, tries + 1);
      }

      if (!creep.getFreeCapacity()) delete cache.mode[creep.id];
      if (!creep.getUsedCapacity()) cache.mode[creep.id] = true;

      break;
    }
  }

  if (!target) {
    delete cache.mode[creep.id];
  }

  if (creep.memory.role === MyCreepRole.UPGRADER && creep.room.controller) {
    const rangeToController = creep.rangeTo(creep.room.controller);

    if (rangeToController > 8) {
      creep.drop(RESOURCE_ENERGY);
    }

    if (rangeToController > 3) {
      creep.moveTo(creep.room.controller);
    }
  }

  if (creep.memory.role === MyCreepRole.HARVESTER && creep.canTransfer()) {
    const cWR = _.first(
      creep.pos.findInRange(FIND_MY_CREEPS, 1, {
        filter: c => c.memory.role === MyCreepRole.MULE && c.getFreeCapacity() > 0
      })
    );

    if (cWR) creep.transfer(cWR, RESOURCE_ENERGY);
  }

  if (creep.memory.role === MyCreepRole.MULE && creep.canTransfer()) {
    const cWR = _.first(
      creep.pos.findInRange(FIND_MY_CREEPS, 1, {
        filter: c => c.memory.role === MyCreepRole.MULE && c.getFreeCapacity() < creep.getFreeCapacity()
      })
    );

    if (cWR) creep.transfer(cWR, RESOURCE_ENERGY);
  }

  //   if (creep.canWork() && creep.room.controller && creep.room.controller.my && creep.rangeTo(creep.room.controller)) {
  //     creep.upgradeController(creep.room.controller);
  //   }

  //   if (creep.canWork() && creep.getUsedCapacity() > 20) {
  //     const tWR = _.first(
  //       creep.pos.findInRange(FIND_STRUCTURES, 3, {
  //         filter: s => s.hitsMax > s.hits
  //       })
  //     );

  //     if (tWR) creep.repair(tWR);
  //   }
  // }

  if (creep.memory.role === MyCreepRole.MULE && !target) {
    if (creep.rangeTo(Game.spawns.Spawn1) > 10) creep.moveTo(Game.spawns.Spawn1);
    if (creep.room.controller && creep.rangeTo(Game.spawns.Spawn1) < 10) creep.moveTo(creep.room.controller);
  }

  if (creep.memory.role === MyCreepRole.HARVESTER) {
    const cWR = _.first(
      creep.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      })
    );

    if (cWR) creep.transfer(cWR, RESOURCE_ENERGY);
  }

  if (creep.memory.role === MyCreepRole.UPGRADER) {
    if (!creep.getUsedCapacity()) {
      const container = _.first(
        creep.pos.findInRange(FIND_STRUCTURES, 5, {
          filter: s =>
            s.structureType === STRUCTURE_CONTAINER &&
            s.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
            s.room &&
            s.room.controller &&
            s.pos.getRangeTo(s.room.controller) <= 8
        })
      );

      if (container) creep.moveTo2(container);
    }

    const cWR = _.first(
      creep.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      })
    );

    if (cWR) creep.withdraw(cWR, RESOURCE_ENERGY);
  }

  if (
    (creep.memory.role === MyCreepRole.UPGRADER || creep.memory.role === MyCreepRole.HARVESTER) &&
    creep.getUsedCapacity(RESOURCE_ENERGY) > 5 &&
    creep.canTransfer()
  ) {
    const cWR = _.first(
      creep.pos.findInRange(FIND_MY_CREEPS, 1, {
        filter: c =>
          c.memory.role === creep.memory.role &&
          c.getUsedCapacity(RESOURCE_ENERGY) < creep.getUsedCapacity(RESOURCE_ENERGY) - 10
      })
    );

    if (cWR) creep.transfer(cWR, RESOURCE_ENERGY, 10);
  }
};

export const CreepManager = {
  run
};
