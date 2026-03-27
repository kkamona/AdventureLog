export function diffApplier(cb) {
    let last = undefined;
    return (current) => {
        if (current) {
            for (let key in current) {
                let lastValue = last?.[key];
                let newValue = current[key];
                if (lastValue !== newValue) {
                    cb(key, newValue, lastValue);
                }
            }
        }
        else if (last) {
            for (let key in last) {
                cb(key, undefined, last[key]);
            }
        }
        last = current;
    };
}
