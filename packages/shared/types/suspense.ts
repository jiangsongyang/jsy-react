import { ReactContext } from './context'

export type Usable<T> = Thenable<T> | ReactContext<T>

export interface Wakeable<Result = any> {
  then(onFulfill: () => Result, onReject: () => Result): void | Wakeable<Result>
}

interface ThenableImpl<T, Result, Err> {
  then(onFulfill: (value: T) => Result, onReject: (error: Err) => Result): void | Wakeable<Result>
}

export interface UntrackedThenable<T, Result, Err> extends ThenableImpl<T, Result, Err> {
  status?: void
}

export interface PendingThenable<T, Result, Err> extends ThenableImpl<T, Result, Err> {
  status: 'pending'
}

export interface FulfilledThenable<T, Result, Err> extends ThenableImpl<T, Result, Err> {
  status: 'fulfilled'
  value: T
}

export interface RejectedThenable<T, Result, Err> extends ThenableImpl<T, Result, Err> {
  status: 'rejected'
  reason: Err
}

export type Thenable<T, Result = void, Err = any> =
  | UntrackedThenable<T, Result, Err>
  | PendingThenable<T, Result, Err>
  | FulfilledThenable<T, Result, Err>
  | RejectedThenable<T, Result, Err>
