import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        /** True if this is an icon button. This will both enable the built-in MapLibre
           * icon button styling and center the element inside the button.
           * @default true since most map buttons are icons. */ icon?: boolean;
        center?: boolean;
        title?: string | undefined;
        class?: string | undefined;
    };
    events: {
        click: MouseEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type ControlButtonProps = typeof __propDef.props;
export type ControlButtonEvents = typeof __propDef.events;
export type ControlButtonSlots = typeof __propDef.slots;
export default class ControlButton extends SvelteComponentTyped<ControlButtonProps, ControlButtonEvents, ControlButtonSlots> {
}
export {};
