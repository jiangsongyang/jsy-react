import {
  unstable_IdlePriority,
  unstable_ImmediatePriority,
  unstable_NormalPriority,
  unstable_UserBlockingPriority,
  unstable_getCurrentPriorityLevel,
} from 'scheduler'
import { FiberRootNode } from './fiber'

export type Lane = number
export type Lanes = number

export const SyncLane = 0b0001
export const NoLane = 0b0000
export const NoLanes = 0b0000
export const InputContinuousLane = 0b0010
export const DefulatLane = 0b0100
export const IdelLane = 0b0100

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
  return laneA | laneB
}

export function requestUpdateLane() {
  // 从上下文环境中获取优先级
  const currentSchedulerPriority = unstable_getCurrentPriorityLevel()
  const lane = schedulerPriorityToLane(currentSchedulerPriority)
  return lane
}

export function getHeightestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
  root.pendingLanes &= ~lane
}

export const lanesToSchedulerPriority = (lanes: Lanes) => {
  const lane = getHeightestPriorityLane(lanes)

  if (lane === SyncLane) {
    return unstable_ImmediatePriority
  }
  if (lane === InputContinuousLane) {
    return unstable_UserBlockingPriority
  }
  if (lane === DefulatLane) {
    return unstable_NormalPriority
  }
  return unstable_IdlePriority
}

export function isSubsetOfLanes(set: Lanes, subset: Lane) {
  return (set & subset) === subset
}

export const schedulerPriorityToLane = (priority: number) => {
  if (priority === unstable_ImmediatePriority) {
    return SyncLane
  }
  if (priority === unstable_UserBlockingPriority) {
    return InputContinuousLane
  }
  if (priority === unstable_NormalPriority) {
    return DefulatLane
  }
  return NoLane
}
