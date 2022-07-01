import { MyCreepRole, Roles } from "creep/jobs";

export const sortParts = (parts: BodyPartConstant[]): BodyPartConstant[] =>
  _.sortBy(parts, part => {
    if (part === TOUGH) return 1;
    if (part === CLAIM) return 2;
    if (part === CARRY) return 2;
    if (part === MOVE) return 3;
    if (part === RANGED_ATTACK) return 4;
    if (part === ATTACK) return 5;
    if (part === HEAL) return 6;
    return 7;
  });

const run = (spawn: StructureSpawn): void => {
  // dont spawn creeps if already spawning, below 50 energy
  if (spawn.spawning || spawn.room.energyAvailable < 50) return;

  // if (spawn.room.memory.totalResources > 1000) {
  //   const cWR = _.first(
  //     _.sortBy(
  //       spawn.pos.findInRange(FIND_MY_CREEPS, 1, {
  //         filter: c => (c.ticksToLive || 100) < 500
  //       }),
  //       c => c.ticksToLive
  //     )
  //   );
  //   if (cWR) spawn.renewCreep(cWR);
  // }

  const { room } = spawn;

  if (!room.controller || !room.controller.my) return;

  // if (
  //   spawn.room.energyAvailable >= spawn.room.energyCapacityAvailable &&
  //   _.find(Game.creeps, (c: Creep) => c.my && (c.spawning || c.memory.recycle || c.memory.renew)) === undefined
  // ) {
  //   _.filter(
  //     Game.creeps,
  //     c => c.memory.home === spawn.room.name && c.room.name === spawn.room.name && !c.memory.recycle
  //   ).forEach(creep => {
  //     const mulesOK =
  //       creep.room.memory.creepsSpawned[MyCreepRole.MULE] >= creep.room.memory.creepsToSpawn[MyCreepRole.MULE] &&
  //       creep.room.memory.creepsSpawned[MyCreepRole.MULE] > 3;
  //     const harvestersOK =
  //       creep.room.memory.creepsSpawned[MyCreepRole.HARVESTER] >=
  //         creep.room.memory.creepsToSpawn[MyCreepRole.HARVESTER] &&
  //       creep.room.memory.creepsSpawned[MyCreepRole.HARVESTER] > 3 &&
  //       creep.room.memory.creepsSpawned[MyCreepRole.MULE] > 3;
  //     const upgradersOK =
  //       creep.room.memory.creepsSpawned[MyCreepRole.UPGRADER] >=
  //         creep.room.memory.creepsToSpawn[MyCreepRole.UPGRADER] &&
  //       creep.room.memory.creepsSpawned[MyCreepRole.UPGRADER] > 0;

  //     // only upgrade when Harvesters, Mules and Upgraders are maxed
  //     if (mulesOK && harvestersOK && upgradersOK) {
  //       const parts = sortParts(Roles[creep.memory.role].spawnBody(spawn));
  //       const cost = partsCost(parts);

  //       // make sure we know how many parts we need to save
  //       const creepParts = sortParts(creep.body.map(b => b.type));

  //       // if creep can get more parts, do it!
  //       if (!_.isMatch(parts, creepParts) && cost <= creep.room.energyAvailable) {
  //         creep.memory.recycle = true;
  //         creep.memory.renew = undefined;

  //         console.log(creep.name, "should recycle.");
  //         console.log("   parts :", creepParts);
  //         console.log("   should:", parts);
  //         console.log("   cost  :", cost);
  //       }
  //     }
  //   });
  // }

  let spawning = false;

  // Spawn creeps
  for (const role in room.memory.creepsToSpawn) {
    if (spawning || spawn.spawning) {
      break;
    }

    const minCreep = room.memory.creepsToSpawn[role as MyCreepRole];
    if (room.memory.creepsSpawned[role as MyCreepRole] >= minCreep) continue;

    // // get a creep body
    const creepRole = Roles[role as MyCreepRole];
    if (!creepRole) continue;

    // // get the body of the soon to be creep
    const body = creepRole.spawnBody(spawn);

    if (!body || !body.length) {
      continue;
    }

    let i = 1;
    let creepName = role + String(i);

    while (Game.creeps[creepName] !== undefined) {
      creepName = role + String(i);
      i++;
    }

    const opts: SpawnOptions = {
      memory: {
        role: role as MyCreepRole,
        home: room.name
      }
    };

    const spawnResult = spawn.spawnCreep(sortParts(body), creepName, opts);

    spawning = spawnResult === OK;

    room.memory.creepsSpawned[role as MyCreepRole]++;
  }
};

export const SpawnManager = {
  run
};
