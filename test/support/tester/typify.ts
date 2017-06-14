import * as ava from 'ava';

export function beforeEach<T>(getContext: () => Promise<T>): ava.RegisterContextual<T> {
    ava.test.beforeEach(async t => {
        Object.assign(t.context, await getContext());
    });

    return ava.test;
}
