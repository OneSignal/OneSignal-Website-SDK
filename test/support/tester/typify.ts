import ava, { RegisterContextual } from 'ava';

export function beforeEach<T>(getContext: () => Promise<T>): RegisterContextual<T> {
    ava.beforeEach(async t => {
        Object.assign(t.context, await getContext());
    });

    return ava;
}
