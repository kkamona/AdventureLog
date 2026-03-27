import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        class?: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type ControlGroupProps = typeof __propDef.props;
export type ControlGroupEvents = typeof __propDef.events;
export type ControlGroupSlots = typeof __propDef.slots;
export default class ControlGroup extends SvelteComponentTyped<ControlGroupProps, ControlGroupEvents, ControlGroupSlots> {
}
export {};
