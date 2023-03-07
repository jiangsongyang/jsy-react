import type { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import internals from '@jsy-react/shared/internals'
import { Action } from 'shared'
import type { FiberNode } from './fiber'
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
} from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'

const { currentDispatcher } = internals

export interface Hook {
  /**
   *
   * 这个跟 fiberNode 里的 memoizedState 不一样
   * FiberNode 里的 memoizedState 是指向一个 fc 的 hook 链表的第 0 个
   * 而这个 memoizedState 是指 当前 hook 的状态
   */
  memoizedState: any
  updateQueue: unknown
  next: Hook | null
}

// 当前正在渲染的 function component
let currentRenderingFiber: FiberNode | null = null
// 当前正在处理的 hook
let workInProgressHook: Hook | null = null
//
let currentHook: Hook | null = null

export const renderWithHooks = (workInProgress: FiberNode) => {
  // 保存当前工作的 fiber
  currentRenderingFiber = workInProgress
  // 重置
  workInProgress.memoizedState = null

  const current = workInProgress.alternate

  // 判断是 mount 还是 update
  // 根据场景不同 将 shared 里的 currentDispatcher.current 指向不同的 hooksDispatcher
  // 在执行 fc 的时候就可以拿到对应的 hooksDispatcher
  if (current) {
    // update
    currentDispatcher.current = hooksDispatcherOnUpdate
  } else {
    // mount
    currentDispatcher.current = hooksDispatcherOnMount
  }

  const Component = workInProgress.type
  const props = workInProgress.pendingProps
  const childen = Component(props)

  currentRenderingFiber = null

  return childen
}

const mountState = <State>(initialState: () => State | State) => {
  // 找到当前 useState 对应的 hook 数据
  const hook = mountWorkInProgressHook()

  let memoizedState = null

  if (typeof initialState === 'function') {
    memoizedState = initialState()
  } else {
    memoizedState = initialState
  }

  const queue = createUpdateQueue<State>()
  hook.updateQueue = queue

  // dispatch 可以脱离 react 环境运行 所以这里需要bind一下 之后传两个参数 这样用户只需要传入 newState
  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentRenderingFiber!, queue)
  queue.dispatch = dispatch

  return [memoizedState, dispatch] as [State, Dispatch<State>]
}

const updateState: <State>() => [State, Dispatch<State>] = <State>() => {
  // 找到当前 useState 对应的 hook 数据
  const hook = updateWorkInProgressHook()

  // 计算新 state 的逻辑
  const queue = hook.updateQueue as UpdateQueue<State>
  const pending = queue.shared.pending

  if (pending !== null) {
    const { memoizedState } = processUpdateQueue(hook.memoizedState, pending)
    hook.memoizedState = memoizedState
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

const dispatchSetState = <State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>
) => {
  const update = createUpdate(action)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber)
}

const mountWorkInProgressHook = () => {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
  }
  if (workInProgressHook === null) {
    // 第一个 hook
    // 创建 && 赋值
    if (currentRenderingFiber === null) {
      throw new Error('请在函数组件内调用 hook')
    } else {
      workInProgressHook = hook
      currentRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount 时后续的 hook
    // 更新指向
    workInProgressHook.next = hook
    workInProgressHook = hook
  }

  return workInProgressHook
}

const updateWorkInProgressHook = () => {
  let nextCurrentHook: Hook | null = null
  // fc update 第一个 hook
  if (currentHook === null) {
    const current = currentRenderingFiber?.alternate
    if (current !== null) {
      nextCurrentHook = current?.memoizedState
    } else {
      nextCurrentHook = null
    }
  } else {
    // 这个 fc update 时 后续的 hook
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    // mount  u1 u2 u3
    // update u1 u2 u3 u4
    throw new Error(`组件 ${currentRenderingFiber?.type} 的 hook 比上次多`)
  }

  currentHook = nextCurrentHook
  const newHook: Hook = {
    memoizedState: currentHook?.memoizedState,
    updateQueue: currentHook?.updateQueue,
    next: null,
  }
  if (workInProgressHook === null) {
    // 第一个 hook
    // 创建 && 赋值
    if (currentRenderingFiber === null) {
      throw new Error('请在函数组件内调用 hook')
    } else {
      workInProgressHook = newHook
      currentRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount 时后续的 hook
    // 更新指向
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }
  return workInProgressHook
}

const hooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: () => {},
}

const hooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: () => {},
}
