import { SvelteComponentTyped } from "svelte";
import maplibregl from 'maplibre-gl';
declare const __propDef: {
    props: {
        position?: maplibregl.ControlPosition;
        maxWidth?: number | undefined;
        unit?: "imperial" | "metric" | "nautical";
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type ScaleControlProps = typeof __propDef.props;
export type ScaleControlEvents = typeof __propDef.events;
export type ScaleControlSlots = typeof __propDef.slots;
export default class ScaleControl extends SvelteComponentTyped<ScaleControlProps, ScaleControlEvents, ScaleControlSlots> {
}
export {};
