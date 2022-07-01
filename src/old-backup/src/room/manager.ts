import { MyCreepRole, Roles } from "creep/jobs";
import { walkablePositions } from "utils";
import { buildLayout } from "./build";

const run = (room: Room): void => {
  // const structures = room
  //   .find(FIND_STRUCTURES)
  //   .filter(s => s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER) as MyStorageTypes[];

  const constructionSites = _.filter(Game.constructionSites, site => site.room === room).length;
  const structures = room.find(FIND_STRUCTURES);
  const hostile = _.first(room.find(FIND_HOSTILE_CREEPS));
  const droppedResources = room.find(FIND_DROPPED_RESOURCES).filter(r => r.amount >= 2);

  if (hostile) {
    _.filter(room.find(FIND_MY_STRUCTURES), s => s.my && s.structureType === STRUCTURE_TOWER).forEach(t => {
      (t as StructureTower).attack(hostile);
    });
  }

  room.memory.constructionSites = constructionSites;
  room.memory.totalStructures = structures.length - 2 + constructionSites; // not counting spawn and controller

  if (!constructionSites && Game.time % 20 === 1) {
    buildLayout(Game.spawns.Spawn1.pos, room, true);
  }

  room.memory.totalTombstones = room.find(FIND_TOMBSTONES).length;
  room.memory.totalDroppedResources = droppedResources.reduce((a, b) => a + b.amount, 0);
  room.memory.totalDroppedResources += room
    .find(FIND_RUINS)
    .reduce((a, b) => a + b.getUsedCapacity(RESOURCE_ENERGY), 0);

  room.memory.totalResources = _.filter(droppedResources, r => r.resourceType === RESOURCE_ENERGY).reduce(
    (a, b) => a + b.amount,
    0
  );

  room.memory.totalResources += _.filter(
    structures,
    s => s instanceof StructureContainer || s instanceof StructureStorage
  ).reduce((a, b) => a + (b as MyStorageTypes).getUsedCapacity(RESOURCE_ENERGY), 0);

  room.memory.totalResources += _.filter(
    Game.creeps,
    c => c.my && !c.spawning && c.room === room && c.memory.role !== MyCreepRole.UPGRADER
  ).reduce((num, c) => num + c.getUsedCapacity(RESOURCE_ENERGY), 0);

  if (!room.memory.totalSourcePositions || room.name === "sim") {
    room.memory.totalSourcePositions = room
      .find(FIND_SOURCES)
      .map(source => walkablePositions(source))
      .reduce((a, c) => a + c, 0);
  }

  // count creeps spawned by this room
  room.memory.creepsSpawned = _.mapValues(
    _.mapKeys(Roles, (r, key) => key),
    (r, role) => _.filter(Game.creeps, c => c.my && c.memory.role === role && c.memory.home === room.name).length
  ) as MyCreepsSpawnable;

  room.memory.creepsToSpawn = _.mapValues(
    _.mapKeys(Roles, (r, key) => key),
    r => r.ratio(room)
  ) as MyCreepsSpawnable;

  // console.log(`room: ${room.name} memory:`, JSON.stringify(room.memory, null, 4));
};

export const RoomManager = {
  run
};
