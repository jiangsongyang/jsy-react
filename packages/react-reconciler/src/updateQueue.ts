import type { Action } from '@jsy-react/shared'
import { Dispatch } from 'react/src/currentDispatcher'
import type { Lane } from './fiberLanes'

export interface Update<State> {
  action: Action<State>
  lane: Lane
  next: Update<any> | null
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

/** 创建更新 */
export const createUpdate = <State>(action: Action<State>, lane: Lane) => {
  return {
    action,
    lane,
    next: null,
  }
}

/** 创建更新队列 */
export const createUpdateQueue = <State>() => {
  return {
    shared: {
      pending: null,
    },
    dispatch: null,
  } as UpdateQueue<State>
}

/** 入队方法 */
export const enqueueUpdate = <State>(updateQueue: UpdateQueue<State>, update: Update<State>) => {
  const pending = updateQueue.shared.pending
  if (pending === null) {
    // 当前 fiber 上没有更新任务
    // 构建 环状链表
    // pending = a -> a
    update.next = update
  } else {
    // 当前 fiber 上有更新任务
    // 构建 环状链表

    // b.next = a.next
    update.next = pending.next
    // a.next = b
    pending.next = update
  }

  // pending 指向最后一个 update
  // pending.next 指向第一个 update
  updateQueue.shared.pending = update
}

/** 消费更新的方法 */
export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State>
): { memoizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = { memoizedState: baseState }
  if (pendingUpdate !== null) {
    // baseState 1 update 2 -> memoizedState 2
    // baseState 1 update (x) => 2x -> memoizedState 2
    const action = pendingUpdate.action
    if (action instanceof Function) {
      result.memoizedState = action(baseState)
    } else {
      result.memoizedState = action
    }
  }

  return result
}
