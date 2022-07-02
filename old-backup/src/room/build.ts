import { CONFIG } from "config";

interface LayoutKey {
  [name: string]: BuildableStructureConstant;
}

// maps letters in the layout arrays to structures and vice versa
const layoutKey = {
  A: STRUCTURE_SPAWN,
  N: STRUCTURE_NUKER,
  K: STRUCTURE_LINK,
  L: STRUCTURE_LAB,
  E: STRUCTURE_EXTENSION,
  S: STRUCTURE_STORAGE,
  T: STRUCTURE_TOWER,
  O: STRUCTURE_OBSERVER,
  M: STRUCTURE_TERMINAL,
  P: STRUCTURE_POWER_SPAWN,
  ".": STRUCTURE_ROAD,
  C: STRUCTURE_CONTAINER,
  R: STRUCTURE_RAMPART,
  W: STRUCTURE_WALL
} as LayoutKey;

interface SimplePositions {
  [name: string]: number[][];
}

export const getBuildPositions = function (layout: string[]): SimplePositions {
  if (!layout.length) return {};

  const height = layout.length;
  const width = layout[0].length;
  const top = Math.floor(height / 2) || 0;
  const left = Math.floor(width / 2) || 0;
  const positions = {} as SimplePositions;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const char = layout[y][x] as BuildableStructureConstant;
      const key = layoutKey[char] as string;

      if (!key) continue;

      positions[key] = positions[key] || [];
      positions[key].push([x - left, y - top]);
    }
  }

  return positions;
};

export const buildLayout = function (centerPoint: RoomPosition, room: Room, shouldBuild = false): void {
  if (!centerPoint || !room.controller) return;

  _.forEach(CONFIG.buildOrder, layouts => {
    const layout = _.findLast(layouts, (n, level) => room && room.controller && Number(level) <= room.controller.level);
    if (!layout) return;

    const spots = getBuildPositions(layout);

    _.forEach(spots, (positions, structureType = "") => {
      const sType = structureType as BuildableStructureConstant;

      positions
        .map(p => new RoomPosition(centerPoint.x + p[0], centerPoint.y + p[1], room.name))
        .forEach(pos => {
          // something already exists here
          if (
            (!([STRUCTURE_RAMPART, STRUCTURE_ROAD] as BuildableStructureConstant[]).includes(sType) &&
              _.filter(pos.lookFor(LOOK_STRUCTURES), s => s.structureType !== STRUCTURE_ROAD).length) ||
            pos.lookFor(LOOK_CONSTRUCTION_SITES).length
          )
            return;

          // display structure
          room.visual.structure(pos.x, pos.y, sType);

          // preview the structure
          if (shouldBuild && pos.createConstructionSite(sType) === OK) shouldBuild = false;
        });
    });

    // const justRoads = _.filter(spots, (p, structureType = "") => structureType === STRUCTURE_ROAD).flatMap(x => x);

    // _.forEach(justRoads, p => {
    //   for (const dir of dirs) {
    //     const coord = [p[0] + dir[0], p[1] + dir[1]];
    //     if (justRoads.find(r => r[0] === coord[0] && r[1] === coord[1])) {
    //       room.visual.line(
    //         centerPoint.x + p[0],
    //         centerPoint.y + p[1],
    //         centerPoint.x + coord[0],
    //         centerPoint.y + coord[1],
    //         {
    //           color: "#666666",
    //           opacity: 1,
    //           width: 0.25
    //         }
    //       );
    //     }
    //   }
    // });
  });

  // const dirs: number[][] = [
  // [-1, -1],
  // [1, -1],
  // [-1, 1],
  // [1, 1],
  // [0, -1],
  // [-1, 0],
  // [0, 1],
  // [1, 0]
  // ];

  // _.forEach([room.controller, ...room.find(FIND_SOURCES)], place => {
  //   // nothing left to do
  //   if (!shouldBuild && !preview) return;

  //   let range = 1;
  //   if (place instanceof StructureController) range = 3;
  //   if (place instanceof Source) range = 2;

  //   const path = room
  //     .findPath(centerPoint, place.pos, {
  //       maxOps: 20000,
  //       range,
  //       swampCost: 5,
  //       ignoreCreeps: true,
  //       costCallback(roomName, costMatrix) {
  //         _.forEach(avoid, s => {
  //           costMatrix.set(s.pos.x, s.pos.y, 250);
  //         });
  //       }
  //     })
  //     .map(p => new RoomPosition(p.x, p.y, room.name));

  //   // build the roads
  //   if (shouldBuild) {
  //     _.forEach(path, pos => {
  //       if (!shouldBuild) return;
  //       if (pos.lookFor(LOOK_STRUCTURES).length || pos.lookFor(LOOK_CONSTRUCTION_SITES).length) return;
  //       if (pos.createConstructionSite(STRUCTURE_ROAD) === OK) shouldBuild = false;
  //     });
  //   }

  //   // preview the road path to the structure
  //   if (preview) {
  //     room.visual.poly(path, {
  //       stroke: "#fff",
  //       strokeWidth: 0.15,
  //       opacity: 0.2,
  //       lineStyle: "dashed"
  //     });
  //   }
  // });
};
