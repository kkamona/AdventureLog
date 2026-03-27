import { SvelteComponentTyped } from "svelte";
import maplibregl from 'maplibre-gl';
declare const __propDef: {
    props: {
        position?: maplibregl.ControlPosition;
        compact?: boolean;
        customAttribution?: string | string[] | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type AttributionControlProps = typeof __propDef.props;
export type AttributionControlEvents = typeof __propDef.events;
export type AttributionControlSlots = typeof __propDef.slots;
export default class AttributionControl extends SvelteComponentTyped<AttributionControlProps, AttributionControlEvents, AttributionControlSlots> {
}
export {};
