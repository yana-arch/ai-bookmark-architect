import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

export interface PersistedSerializer<T> {
    serialize: (value: T) => string;
    deserialize: (raw: string) => T;
}

export const stringSerializer: PersistedSerializer<string> = {
    serialize: (value) => value,
    deserialize: (raw) => raw,
};

export const numberSerializer: PersistedSerializer<number> = {
    serialize: (value) => value.toString(),
    deserialize: (raw) => parseInt(raw, 10),
};

export const booleanSerializer: PersistedSerializer<boolean> = {
    serialize: (value) => value.toString(),
    deserialize: (raw) => raw === 'true',
};

export const jsonSerializer = <T>(): PersistedSerializer<T> => ({
    serialize: (value) => JSON.stringify(value),
    deserialize: (raw) => JSON.parse(raw) as T,
});

export function usePersistedState<T>(
    key: string,
    defaultValue: T,
    serializer?: PersistedSerializer<T>
): [T, Dispatch<SetStateAction<T>>] {
    const ser = serializer ?? (stringSerializer as PersistedSerializer<T>);

    const [value, setValue] = useState<T>(() => {
        const saved = localStorage.getItem(key);
        if (saved === null) return defaultValue;
        try {
            return ser.deserialize(saved);
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        localStorage.setItem(key, ser.serialize(value));
    }, [key, value, ser]);

    return [value, setValue];
}