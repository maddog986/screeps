export enum ROLE {
    WORKER = "W",
    MULE = "M"
}

export const workers = {
    [ROLE.WORKER]: {
        ratio: 0.8,
        body: [MOVE, MOVE, CARRY, WORK]
    },
    [ROLE.MULE]: {
        ratio: 0.2,
        body: [MOVE, MOVE, CARRY, CARRY]
    }
}
