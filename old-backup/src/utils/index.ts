export const ERR_DONE = -20;

export interface CacheAction {
  [creep: string]: MyReturnCodes;
}

export interface CacheBodyStatus {
  [id: string]: boolean;
}

export interface Cache {
  AvgCpu: number[];
  dir: {
    [id: string]: number;
  };
  mode: {
    [id: string]: boolean;
  };
  temp: {
    transfers: {
      [id: string]: {
        // [key in ResourceConstant]: number;
        [resource in ResourceConstant]?: number;
      };
    };
    rangeCheck: {
      [targetId: string]: number;
    };
    assigned: {
      [target: string]: MyFindTypes[];
    };
    actions: {
      worked: CacheAction;
      transfer: CacheAction;
      moved: CacheAction;
      signed: CacheAction;
      claimed: CacheAction;
      attack: CacheAction;
      heal: CacheAction;
    };
    body: {
      work: CacheBodyStatus;
      move: CacheBodyStatus;
      carry: CacheBodyStatus;
      heal: CacheBodyStatus;
      claim: CacheBodyStatus;
    };
  };
  nearBy: {
    [sourceId: string]: {
      [resouce: string]: {
        [range: number]: LookAtResultWithPos[];
      };
    };
  };
  walkablePositions: {
    [target: string]: {
      [dist: number]: number;
    };
  };
}

export const defaultCacheTemp = {
  AvgCpu: [],
  mode: {},
  transfers: {},
  rangeCheck: {},
  assigned: {},
  actions: {
    worked: {},
    transfer: {},
    moved: {},
    signed: {},
    claimed: {},
    attack: {},
    heal: {}
  },
  body: {
    work: {},
    move: {},
    carry: {},
    heal: {},
    claim: {}
  }
};

export const cache: Cache = {
  AvgCpu: [],
  mode: {},
  dir: {},
  temp: _.cloneDeep(defaultCacheTemp),
  nearBy: {},
  walkablePositions: {}
};

export const fixDirection = function (direction: DirectionConstant | number): DirectionConstant {
  return (((((direction - 1) % 8) + 8) % 8) + 1) as DirectionConstant;
};

export const oppositeDirection = function (direction: DirectionConstant | number): DirectionConstant {
  return fixDirection(direction + 4);
};

export const changeDirection = function (
  direction: DirectionConstant | number,
  change: DirectionConstant | number
): DirectionConstant {
  return fixDirection(direction + change);
};

export function rangeTo(
  source: MyFindTypes | RoomPosition | string,
  target: MyFindTypes | RoomPosition | string
): number {
  if (typeof source === "string") source = Game.getObjectById(source) as MyFindTypes;
  if (typeof target === "string") target = Game.getObjectById(target) as MyFindTypes;

  if (
    !target ||
    !source ||
    (!(target instanceof RoomPosition || source instanceof RoomPosition) && target.room !== source.room)
  )
    return Infinity;

  return (source instanceof RoomPosition ? source : source.pos).getRangeTo(target);
}

export const nearBy = function (target: MyFindTypes, source: LookConstant, range = 1): LookAtResultWithPos[] {
  if (target instanceof RoomPosition || target instanceof Flag) return [];

  const id = target.toString();
  const pos = target instanceof RoomPosition ? target : target.pos;
  const room = target instanceof RoomPosition ? Game.rooms[target.roomName] : Game.rooms[target.pos.roomName];

  if (!cache.nearBy.hasOwnProperty(id)) cache.nearBy[id] = {};
  if (!cache.nearBy[id].hasOwnProperty(source)) cache.nearBy[id][source] = {};

  if (!cache.nearBy[id][source][range]) {
    cache.nearBy[id][source][range] = room
      .lookAtArea(
        Math.max(0, pos.y - range),
        Math.max(0, pos.x - range),
        Math.min(49, pos.y + range),
        Math.min(49, pos.x + range),
        true
      )
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: Object is possibly 'null'.
      .filter(look => look && look[source] && look[source].id !== target.id);
  }

  return cache.nearBy[id][source][range];
};

export const nearByStructures = function (
  target: MyFindTypes,
  structureType: BuildableStructureConstant,
  range = 1
): Structure[] {
  return nearBy(target, LOOK_STRUCTURES, range).map(look => look.structure) as Structure[];
};

export const assigned = function (target: MyFindTypes, creep?: Creep): MyFindTypes[] {
  if (!target || target instanceof RoomPosition || target instanceof Flag) return [];

  return _.filter(
    Game.creeps,
    c => (!creep || (creep !== c && c.rangeTo(target) < creep.rangeTo(target))) && c.memory.target === target.id
  );
  // return cache.temp.assigned[target.id];
};

export const assignedCapacity = function (target: MyStorageTypes, creep?: Creep): number {
  return (assigned(target, creep) as MyStorageTypes[]).reduce((v, c) => v + c.getFreeCapacity(), 0);
};

export const assignedToType = function (structureType: StructureConstant, creep?: Creep): number {
  if (!structureType) return 0;

  return _.filter(
    Game.creeps,
    c => c !== creep && c.memory.target && Game.getObjectById(c.memory.target) instanceof StructureExtension
  ).length;
};

export const walkablePositions = (target: MyFindTypes, dist = 1): number => {
  if (!target || !target.room) return 0;
  if (!cache.walkablePositions[target.id]) cache.walkablePositions[target.id] = {};
  if (!cache.walkablePositions[target.id][dist]) {
    cache.walkablePositions[target.id][dist] = target.room
      .lookAtArea(target.pos.y - dist, target.pos.x - dist, target.pos.y + dist, target.pos.x + dist, true)
      .filter(
        a =>
          ["plain", "swamp"].includes(a.terrain || "wall") &&
          (target.pos.y + dist === a.y ||
            target.pos.y - dist === a.y ||
            target.pos.x + dist === a.x ||
            target.pos.x - dist === a.x)
      ).length;
  }
  return cache.walkablePositions[target.id][dist];
};

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

export const partsCost = function (parts: BodyPartConstant[]): number {
  return parts.reduce((num, part) => num + BODYPART_COST[part], 0);
};

// https://github.com/bencbartlett/Overmind/blob/5eca49a0d988a1f810a11b9c73d4d8961efca889/src/utilities/Cartographer.ts
export enum RoomType {
  SOURCEKEEPER = "SK",
  CORE = "CORE",
  CONTROLLER = "CTRL",
  ALLEY = "ALLEY"
}

interface RoomCoordinates {
  x: number;
  y: number;
  xDir: string;
  yDir: string;
}

export const getRoomCoordinates = (roomName: string): RoomCoordinates | undefined => {
  const coordinateRegex = /(E|W)(\d+)(N|S)(\d+)/g;
  const match = coordinateRegex.exec(roomName);
  if (!match) return;

  const xDir = match[1];
  const x = match[2];
  const yDir = match[3];
  const y = match[4];

  return {
    x: Number(x),
    y: Number(y),
    xDir,
    yDir
  };
};

export const roomType = (roomName: string): RoomType | undefined => {
  const coords = getRoomCoordinates(roomName);
  if (!coords) return;

  if (coords.x % 10 === 0 || coords.y % 10 === 0) {
    return RoomType.ALLEY;
  } else if (coords.x % 10 !== 0 && coords.x % 5 === 0 && coords.y % 10 !== 0 && coords.y % 5 === 0) {
    return RoomType.CORE;
  } else if (coords.x % 10 <= 6 && coords.x % 10 >= 4 && coords.y % 10 <= 6 && coords.y % 10 >= 4) {
    return RoomType.SOURCEKEEPER;
  } else {
    return RoomType.CONTROLLER;
  }
};
