export type DiffApplierCallback<T> = (key: keyof T, value: T[keyof T] | undefined, lastValue: T[keyof T] | undefined) => void;
export declare function diffApplier<T extends object>(cb: DiffApplierCallback<T>): (current: T | undefined) => void;
