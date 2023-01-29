import type { Action } from '@jsy-react/shared'

export interface Update<State> {
  action: Action<State>
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
}

/** 创建更新 */
export const createUpdate = <State>(action: Action<State>) => {
  return {
    action,
  }
}

/** 创建更新队列 */
export const createUpdateQueue = <State>() => {
  return {
    shared: {
      pending: null,
    },
  } as UpdateQueue<State>
}

/** 入队方法 */
export const enqueueUpdate = <State>(updateQueue: UpdateQueue<State>, update: Update<State>) => {
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
