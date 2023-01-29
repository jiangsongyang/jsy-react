export type Action<State> = State | ((prevState: State) => State)
