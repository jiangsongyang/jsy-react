/**
 * lane 越小 且 lane 不为 0
 * 优先级越高
 */

export type Lane = number
export type Lanes = number

export const SyncLane = 0b0001
export const NoLane = 0b0000
export const NoLanes = 0b0000

export const mergeLane: (laneA: Lane, laneB: Lane) => Lanes = (laneA, laneB) => laneA | laneB

export const requestUpdateLane = () => {
  return SyncLane
}

export const getHeightestPriorityLane = (lanes: Lanes) => {
  return lanes & -lanes
}
