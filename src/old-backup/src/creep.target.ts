export enum CachedTypeType {
  ID,
  ROOM,
  POSITION
}

interface TargetStore {
  [name: string]: number;
}

export interface CachedTypeData {
  type: CachedTypeType;
  pos: RooCachedTypeS;
  id: string;
  owner?: string;
  my?: boolean;
  structureType?: StructureConstant;
  body?: BodyPartCount;
  ticksToLive?: number;
  level?: number;
  reservation?: string;
  ticksToRegeneration?: number;
  store?: TargetStore;
  storeCapacity?: TargetStore;
  storeCapacityTotal?: number;
  expires: number;
  signText?: string;
  state?: {
    [name: string]: MyReturnCodes;
  };
}

export class CachedType {
  public id: string;
  public _object: MyFindType | undefined;

  public constructor(id: string | MyFindType, expires = 1) {
    if (typeof id === "string") {
      this.id = id;
    } else if (id instanceof RoomPosition) {
      this.id = `${id.x}-${id.y}-${id.roomName}`;
    } else {
      this.id = id.id;
    }

    if (!this.memory || this.memory.expires < Game.time) {
      const target = (typeof id === "string" ? Game.getObjectById(this.id) : id) as MyFindType;

      if (target) {
        this._object = target;

        this.memory = {} as CachedTypeData;

        // convert pos
        if (target instanceof RoomPosition) {
          this.memory.type = CachedTypeType.POSITION;
          this.memory.pos = { x: target.x, y: target.y, roomName: target.roomName };
          this.memory.id = `${target.x}-${target.y}-${target.roomName}`;
        } else {
          this.memory.type = CachedTypeType.ID;
          this.memory.pos = { x: target.pos.x, y: target.pos.y, roomName: target.pos.roomName };
          this.memory.id = target.id;
        }

        if (
          target instanceof StructureSpawn ||
          target instanceof StructureTower ||
          target instanceof StructureExtension ||
          target instanceof StructureController ||
          target instanceof StructureStorage ||
          target instanceof StructureLab ||
          target instanceof StructureInvaderCore ||
          target instanceof Creep ||
          target instanceof PowerCreep
        ) {
          this.memory.owner = target.owner?.username || "";
          this.memory.my = target.my;
        }

        if (
          target instanceof StructureSpawn ||
          target instanceof StructureTower ||
          target instanceof StructureExtension ||
          target instanceof StructureContainer ||
          target instanceof StructureStorage ||
          target instanceof StructureLab ||
          target instanceof StructureRoad ||
          target instanceof StructureInvaderCore
        ) {
          this.memory.structureType = target.structureType;
        }

        if (target instanceof Creep) {
          const bodyParts = {
            [MOVE]: 0,
            [WORK]: 0,
            [CARRY]: 0,
            [ATTACK]: 0,
            [RANGED_ATTACK]: 0,
            [HEAL]: 0,
            [CLAIM]: 0,
            [TOUGH]: 0
          };

          for (let i = target.body.length - 1; i >= 0; i--) {
            bodyParts[target.body[i].type]++;
          }

          this.memory.body = bodyParts;
          this.memory.ticksToLive = target.ticksToLive;
          this.memory.state = {};
        } else if (target instanceof StructureController) {
          this.memory.level = target.level;
          this.memory.reservation = target.reservation?.username;
          this.memory.signText = target.sign?.text;
        } else if (target instanceof Mineral) {
          this.memory.store = {} as TargetStore;
          this.memory.storeCapacity = {} as TargetStore;

          this.memory.store[target.mineralType] = target.mineralAmount;
          this.memory.storeCapacity[target.mineralType] = target.density;
          this.memory.storeCapacityTotal = target.density;
        } else if (target instanceof Source) {
          this.memory.store = {} as TargetStore;
          this.memory.storeCapacity = {} as TargetStore;

          this.memory.store[RESOURCE_ENERGY] = target.energy;
          this.memory.storeCapacity[RESOURCE_ENERGY] = target.energyCapacity;
          this.memory.storeCapacityTotal = target.energyCapacity;
        }

        if (
          target instanceof StructureSpawn ||
          target instanceof StructureExtension ||
          target instanceof StructureTower
        ) {
          this.memory.store = {} as TargetStore;
          this.memory.storeCapacity = {} as TargetStore;

          this.memory.store[RESOURCE_ENERGY] = target.store[RESOURCE_ENERGY];
          this.memory.storeCapacity[RESOURCE_ENERGY] = target.store.getCapacity(RESOURCE_ENERGY);
          this.memory.storeCapacityTotal = target.store.getCapacity(RESOURCE_ENERGY);
        }

        if (target instanceof Resource) {
          this.memory.store = {} as TargetStore;
          this.memory.storeCapacity = {} as TargetStore;

          this.memory.store[RESOURCE_ENERGY] = target.amount;
          this.memory.storeCapacity[RESOURCE_ENERGY] = 0;
        }

        if (target instanceof StructureContainer || target instanceof StructureStorage || target instanceof Creep) {
          this.memory.store = Object.fromEntries(
            [...Object.keys(target.store), RESOURCE_ENERGY]
              //        .filter(r => target.store[r as ResourceConstant] > 0)
              .map(r => [r, target.store[r as ResourceConstant]])
          );

          this.memory.storeCapacity = Object.fromEntries(
            [...Object.keys(target.store), RESOURCE_ENERGY]
              //        .filter(r => target.store[r as ResourceConstant] > 0)
              .map(r => [r, target.store.getCapacity(r as ResourceConstant)])
          );

          this.memory.storeCapacityTotal = target.store.getCapacity();
        }

        this.memory.expires = Game.time + expires;
      }
    }
  }

  public get memory(): CachedTypeData {
    return Memory.CachedTypes[this.id];
  }

  public set memory(mem: CachedTypeData) {
    Memory.CachedTypes[this.id] = mem;
  }

  public get type(): CachedTypeType {
    return this.memory.type;
  }

  public get pos(): RoomPosition {
    return new RoomPosition(this.memory.pos.x, this.memory.pos.y, this.memory.pos.roomName);
  }

  public get room(): Room | undefined {
    return Game.rooms[this.memory.pos.roomName];
  }

  public get roomName(): string {
    return this.pos.roomName;
  }

  public get ticksToRegeneration(): number {
    return this.memory.ticksToRegeneration || 0;
  }

  public rangeTo(target: RoomPosition | _HasRoomPosition): number {
    const pos = target instanceof RoomPosition ? target : target.pos;
    return this.pos.getRangeTo(pos);
  }

  public isValid(): boolean {
    if (!this.id) return false;
    if (Game.rooms[this.pos.roomName] && !this.getObject()) {
      delete Memory.CachedTypes[this.id];

      Object.values(Game.creeps)
        .filter(c => c.memory.target === this.id)
        .forEach(c => {
          delete c.memory.target;
          delete c.memory.job;
        });

      return false;
    }

    return true;
  }

  public getObject<T>(): T | null {
    return Game.getObjectById(this.id);
  }

  public toString(): string {
    return `[ CachedType ${this.memory.id} ]`;
  }

  public get store(): {
    [name: string]: number;
  } {
    if (this.memory.store) return this.memory.store;

    return {};
  }

  public set store(stor: TargetStore) {
    this.memory.store = stor;
  }

  public get storeCapacity(): {
    [name: string]: number;
  } {
    if (this.memory.storeCapacity) return this.memory.storeCapacity;

    return {};
  }

  public getCapacity(resource?: ResourceConstant | MineralConstant): number {
    if (resource) {
      return this.storeCapacity[resource] || (this.memory.storeCapacityTotal || 0) - _.sum(this.storeCapacity);
    } else {
      return this.memory.storeCapacityTotal || 0;
    }
  }

  public getUsedCapacity(resource?: ResourceConstant | MineralConstant): number {
    if (resource) {
      return this.store[resource] || 0;
    } else {
      return _.sum(this.store);
    }
  }

  public getFreeCapacity(resource?: ResourceConstant | MineralConstant): number {
    if (resource) {
      return this.getCapacity(resource) - (this.store[resource] || 0);
    } else {
      return this.getCapacity() - _.sum(this.store);
    }
  }

  public assigned(creep?: CachedType): CachedType[] {
    return Object.values(Game.creeps)
      .filter(c2 => {
        if (creep && c2.id === creep.id) return false;

        // if (creep && CreepManager.getPriority(creep) > CreepManager.getPriority(c2)) return false;
        // if (CreepManager.isNearToCreepTarget(c2)) return true;
        // if (creep && distance && this.pos.getRangeTo(creep) + 2 > this.pos.getRangeTo(creep)) return false;

        return c2.memory.target === this.memory.id;
      })
      .map(c => new CachedType(c.id));
  }

  public assignedFreeCapacity(creep?: CachedType): number {
    return this.assigned(creep).reduce((a, b) => a + b.getFreeCapacity(), 0);
  }

  public assignedUsedCapacity(creep?: CachedType): number {
    return this.assigned(creep).reduce((a, b) => a + b.getUsedCapacity(), 0);
  }

  public assignedParts(bodyPart: BodyPartConstant = WORK, creep?: CachedType): number {
    return this.assigned(creep).reduce((a, b) => a + (b.memory.body ? b.memory.body[bodyPart] : 0), 0);
  }

  public walkablePositions(dist = 1): number {
    const terrain = Game.map.getRoomTerrain(this.memory.pos.roomName);

    let spots = 0;

    for (let dx = -dist; dx <= dist; dx += 1) {
      for (let dy = -dist; dy <= dist; dy += 1) {
        if (terrain.get(this.pos.x + dx, this.pos.y + dy) === 0) {
          spots++;
        }
      }
    }

    return spots;
  }

  public hasPositionsAvailable(creep?: CachedType): boolean {
    return this.assigned(creep).length < this.walkablePositions();
  }

  public addTransfer(resource: ResourceConstant | MineralConstant = RESOURCE_ENERGY, amount = 0): void {
    if (!amount) return;

    this.store[resource] = (this.store[resource] || 0) + amount;
  }

  public setState(action: string, code: MyReturnCodes): MyReturnCodes {
    if (!this.memory.state) this.memory.state = {};

    this.memory.state[action] = code;
    return code;
  }

  public getState(action: string): MyReturnCodes | undefined {
    if (!this.memory.state) this.memory.state = {};

    return this.memory.state[action];
  }
}

// // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
// export function isCachedType(object: any): object is CachedType {
//   return "id" in object && "type" in object;
// }
