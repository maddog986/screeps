export enum ROLE {
  WORKER = "w",
  REFILLER = "r",
  HARVESTER = "h",
  UPGRADER = "u",
  SCOUT = "s"
}

interface MyOpts {
  range?: number;
}

export const DONE = -20;

export default class CreepManager {
  public static moveTo(creep: CachedType, target: CachedType, opts: MyOpts = {}): MyReturnCodes {
    const c = creep.getObject() as Creep;
    if (!c) return ERR_INVALID_ARGS;

    // target not valid
    if (!target.isValid()) {
      // console.log("HARVEST", creep.name, "ERR_INVALID_TARGET", "NO POSTIONS LEFT. MOVING.");
      return ERR_INVALID_TARGET;
    }

    _.defaults(opts, {
      range: 0
    });

    if (creep.rangeTo(target) > (opts.range || 0)) {
      return c.moveTo(target.pos);
    }

    return DONE;
  }

  public static harvest(creep: CachedType, target: CachedType): MyReturnCodes {
    const screep = creep.getObject() as Creep;

    if (!screep) {
      return ERR_INVALID_ARGS;
    }

    if (!creep.memory.body || !creep.memory.body[WORK]) {
      // console.log("HARVEST ERR_NO_BODYPART", "creep:", creep.name);
      return ERR_NO_BODYPART;
    }

    // target not valid
    if (!target.isValid() || !target.hasPositionsAvailable(creep)) {
      // console.log("HARVEST", creep.name, "ERR_INVALID_TARGET", "NO POSTIONS LEFT. MOVING.");
      return ERR_INVALID_TARGET;
    }

    // make sure source has enough energy
    if (!target.getUsedCapacity()) {
      // console.log("HARVEST", "ERR_BUSY/ERR_NOT_ENOUGH_RESOURCES", target, utils.getUsedCapacity(target));

      // // hang tigh, regenerates soon
      // if (creep.memory.role === ROLE.HARVESTER && target.ticksToRegeneration <= 45) {
      //   return ERR_BUSY;
      // }

      return ERR_NOT_ENOUGH_RESOURCES;
    }

    // move closer to target
    if (target.roomName !== creep.roomName || target.rangeTo(creep) > 1) {
      const move = this.moveTo(creep, target, {
        range: 1
      });

      // console.log("HARVEST MOVETO2", "creep:", creep.name, "target:", target, "move code:", move);

      if (([ERR_NO_BODYPART, ERR_NO_PATH, ERR_INVALID_TARGET, ERR_INVALID_ARGS] as MyReturnCodes[]).includes(move)) {
        return move;
      }

      return ERR_NOT_IN_RANGE; // wait until next tick
    }
    // action already ran creep tick, and to close to run action again
    else if (creep.getState("worked") === OK && target.rangeTo(creep) <= 1) {
      // console.log("HARVEST ERR_BUSY", "creep:", creep.name);
      return ERR_BUSY; // wait until next tick
    }

    if (creep.getCapacity() >= 300 && !creep.getFreeCapacity()) {
      // console.log("HARVEST DONE. creep empty.", "creep:", creep.name);
      return DONE;
    }

    // if (
    //   this.actionCache[target.id] &&
    //   (this.actionCache[target.id].cache as { totalDropped: number }).totalDropped > 0
    // ) {
    //   return DONE;
    // }

    // harvests
    const work = creep.setState("worked", screep.harvest(target.getObject() as Source));
    // console.log("HARVEST work:", work, "creep:", creep.name);

    // harvest successfull
    if (work === OK) {
      const startEnergy = creep.memory.body[WORK] * 2;

      let resourceType: ResourceConstant = RESOURCE_ENERGY;

      if (target instanceof Mineral) {
        resourceType = target.mineralType;
      } else if (target instanceof Deposit) {
        resourceType = target.depositType;
      }

      creep.addTransfer(resourceType, startEnergy);
      target.addTransfer(resourceType, -startEnergy);
    }

    if (!creep.getFreeCapacity()) {
      // console.log("HARVEST DONE. creep full.", "creep:", creep.name);
      return DONE;
    }

    return work;
  }

  public static transfer(
    creep: CachedType,
    target: CachedType,
    resource?: ResourceConstant | MineralConstant,
    amount?: number
  ): MyReturnCodes {
    const screep = creep.getObject() as Creep;

    if (!screep) {
      return ERR_INVALID_ARGS;
    }

    if (!creep.memory.body || !creep.memory.body[CARRY]) {
      // console.log("TRANSFER ERR_NO_BODYPART", "creep:", creep.name);
      return ERR_NO_BODYPART;
    }

    // target not valid
    if (!target.isValid()) {
      // console.log("TRANSFER", creep.name, "ERR_INVALID_TARGET", "NO POSTIONS LEFT. MOVING.");
      return ERR_INVALID_TARGET;
    }

    // move closer to target
    if (target.roomName !== creep.roomName || creep.rangeTo(target) > 1) {
      const move = this.moveTo(creep, target, {
        range: 1
      });

      // console.log("TRANSFER MOVETO2", "creep:", creep.name, "target:", target, "move code:", move);

      if (([ERR_NO_BODYPART, ERR_NO_PATH, ERR_INVALID_TARGET, ERR_INVALID_ARGS] as MyReturnCodes[]).includes(move)) {
        return move;
      }

      return ERR_NOT_IN_RANGE; // wait until next tick
    }
    // action already ran creep tick, and to close to run action again
    else if (creep.getState("transfer") === OK && creep.rangeTo(target) <= 1) {
      // console.log("TRANSFER ERR_BUSY", "creep:", creep.name);
      return ERR_BUSY; // wait until next tick
    }

    if (!target.getFreeCapacity()) {
      // console.log("transfer, ERR_FULL", target, utils.getFreeCapacity(target));
      return ERR_FULL;
    }

    if (
      target.memory.structureType &&
      ([STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER] as StructureConstant[]).includes(
        target.memory.structureType
      ) &&
      !creep.getUsedCapacity(RESOURCE_ENERGY)
    ) {
      // console.log("transfer, ERR_INVALID_TARGET", target, "cap:", utils.getFreeCapacity(creep, RESOURCE_ENERGY));
      return ERR_INVALID_TARGET;
    }

    if (!resource) {
      resource = Object.keys(creep.store).find(
        resourceType => creep.store[resourceType as ResourceConstant] > 0
      ) as ResourceConstant;

      if (!resource) {
        // console.log("transfer, ERR_NOT_ENOUGH_RESOURCES", creep);
        return ERR_NOT_ENOUGH_RESOURCES;
      }
    }

    // have to wait until next tick to use resources
    if (!creep.getUsedCapacity(resource)) {
      // console.log("transfer, ERR_NOT_ENOUGH_RESOURCES", creep, utils.getUsedCapacity(creep, RESOURCE_ENERGY));
      return ERR_NOT_ENOUGH_RESOURCES;
    }

    if (!amount) {
      amount = creep.getUsedCapacity(resource);
    }

    // make sure we set a max on transfer
    amount = Math.min(amount, target.getFreeCapacity(), creep.getUsedCapacity(resource));

    let transfer = creep.setState("transfer", screep.transfer(target.getObject() as MyTransferType, resource, amount));
    console.log(
      "transfer transfer code:",
      transfer,
      "amount:",
      amount,
      "creep:",
      screep.name,
      "target:",
      target.getObject(),
      "creep cap:",
      creep.getCapacity(),
      "target cap:",
      target.getCapacity()
    );

    // have to wait until next tick to use resources
    if (transfer === ERR_NOT_ENOUGH_RESOURCES && creep.getUsedCapacity(RESOURCE_ENERGY)) {
      // console.log("transfer ERR_BUSY1", "creep:", creep.name, "target:", target);
      transfer = ERR_BUSY;
    }
    // transfer says target is full, but we know its not
    else if (transfer === ERR_FULL && target.getFreeCapacity()) {
      // console.log("transfer ERR_BUSY2", "creep:", creep.name, "target:", target);
      transfer = ERR_BUSY;
    }
    // transfer went through
    else if (transfer === OK) {
      // record transfers
      creep.addTransfer(resource, -amount);
      target.addTransfer(resource, amount);
    }

    return transfer;
  }
}
