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
import { Lane, NoLane, requestUpdateLane } from './fiberLanes'
import { Flags, PassiveEffect } from './fiberFlags'
import { HookHasEffect, Passive } from './hookEffectTags'

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

let renderLane: Lane = NoLane

export const renderWithHooks = (workInProgress: FiberNode, lane: Lane) => {
  // 保存当前工作的 fiber
  currentRenderingFiber = workInProgress
  // 重置
  workInProgress.memoizedState = null
  renderLane = lane
  // 重置effect
  workInProgress.updateQueue = null

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

  // 重置
  renderLane = NoLane
  currentRenderingFiber = null

  return childen
}
/**
 * ====================== state hook ======================
 */
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
  hook.memoizedState = memoizedState

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
  // 重置
  queue.shared.pending = null

  if (pending !== null) {
    const { memoizedState } = processUpdateQueue(hook.memoizedState, pending, renderLane)
    hook.memoizedState = memoizedState
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

const dispatchSetState = <State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>
) => {
  const lane = requestUpdateLane()
  const update = createUpdate(action, lane)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber, lane)
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
  // TODO render阶段触发的更新
  let nextCurrentHook: Hook | null

  if (currentHook === null) {
    // 这是这个FC update时的第一个hook
    const current = currentRenderingFiber?.alternate
    if (current !== null) {
      nextCurrentHook = current?.memoizedState
    } else {
      // mount
      nextCurrentHook = null
    }
  } else {
    // 这个FC update时 后续的hook
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    // mount/update u1 u2 u3
    // update       u1 u2 u3 u4
    throw new Error(`组件${currentRenderingFiber?.type}本次执行时的Hook比上次执行时多`)
  }

  currentHook = nextCurrentHook as Hook
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
  }
  if (workInProgressHook === null) {
    // mount时 第一个hook
    if (currentRenderingFiber === null) {
      throw new Error('请在函数组件内调用hook')
    } else {
      workInProgressHook = newHook
      currentRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount时 后续的hook
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }
  return workInProgressHook
}

/**
 * ====================== effect hook ======================
 */
type EffectCallback = () => void

type EffectDeps = any[] | null

export interface Effect {
  tag: number
  create: EffectCallback | void
  destroy: EffectCallback | void
  deps: EffectDeps
  next: Effect | null
}

const mountEffect = (create: EffectCallback | void, deps?: EffectDeps) => {
  const hook = mountWorkInProgressHook()

  const nextDeps = deps === undefined ? null : deps

  // mount 时 当前 fiber 标记 需要处理 effect
  ;(currentRenderingFiber as FiberNode).flags |= PassiveEffect
  hook.memoizedState = pushEffect(Passive | HookHasEffect, create, undefined, nextDeps)
}

const updateEffect = (create: EffectCallback | void, deps?: EffectDeps) => {
  const hook = updateWorkInProgressHook()

  const nextDeps = deps === undefined ? null : deps
  let destory: EffectCallback | void

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState
    destory = prevEffect.destroy
    if (deps !== null) {
      // 浅比较
      const prevDeps = prevEffect.deps
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 依赖项没有变化
        hook.memoizedState = pushEffect(Passive, create, destory, nextDeps)
      } else {
        // 依赖项变化
        currentRenderingFiber!.flags |= PassiveEffect
        hook.memoizedState = pushEffect(Passive | HookHasEffect, create, destory, nextDeps)
      }
    }
  }
}

const areHookInputsEqual = (nextDeps: EffectDeps, prevDeps: EffectDeps) => {
  if (prevDeps === null || nextDeps === null) {
    return false
  }

  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue
    } else {
      return false
    }
  }

  return true
}

const pushEffect = (
  hookFlags: Flags,
  create: EffectCallback | void,
  destroy: EffectCallback | void,
  deps: EffectDeps
) => {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destroy,
    deps,
    next: null,
  }
  const fiber = currentRenderingFiber as FiberNode

  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  // 当前 fiber 没有 updateQueue
  if (updateQueue === null) {
    const updateQueue = createFCUpdateQueue()
    fiber.updateQueue = updateQueue
    effect.next = effect
    updateQueue.lastEffect = effect
  } else {
    // 插入 effect
    const lastEffect = updateQueue.lastEffect
    if (lastEffect === null) {
      effect.next = effect
      updateQueue.lastEffect = effect
    } else {
      const firstEffect = lastEffect.next
      lastEffect.next = effect
      effect.next = firstEffect
      updateQueue.lastEffect = effect
    }
  }

  return effect
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null
}

const createFCUpdateQueue = <State>() => {
  const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>
  updateQueue.lastEffect = null
  return updateQueue
}

const hooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
}

const hooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
}
