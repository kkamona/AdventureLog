import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        defaultStyling?: boolean;
        position?: maplibregl.ControlPosition;
        class?: string | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type ControlProps = typeof __propDef.props;
export type ControlEvents = typeof __propDef.events;
export type ControlSlots = typeof __propDef.slots;
export default class Control extends SvelteComponentTyped<ControlProps, ControlEvents, ControlSlots> {
}
export {};
