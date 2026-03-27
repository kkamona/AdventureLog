import { SvelteComponentTyped } from "svelte";
import maplibregl from 'maplibre-gl';
declare const __propDef: {
    props: {
        position?: maplibregl.ControlPosition;
        container?: HTMLElement | string | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type FullscreenControlProps = typeof __propDef.props;
export type FullscreenControlEvents = typeof __propDef.events;
export type FullscreenControlSlots = typeof __propDef.slots;
export default class FullscreenControl extends SvelteComponentTyped<FullscreenControlProps, FullscreenControlEvents, FullscreenControlSlots> {
}
export {};
