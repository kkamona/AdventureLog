import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        data: Array<Record<string, string | number | undefined>>;
        idCol: string;
        sourceLayer?: string | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type JoinedDataProps = typeof __propDef.props;
export type JoinedDataEvents = typeof __propDef.events;
export type JoinedDataSlots = typeof __propDef.slots;
export default class JoinedData extends SvelteComponentTyped<JoinedDataProps, JoinedDataEvents, JoinedDataSlots> {
}
export {};
