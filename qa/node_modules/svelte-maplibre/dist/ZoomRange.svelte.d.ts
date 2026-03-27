import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        minzoom?: number | undefined;
        maxzoom?: number | undefined;
        /** If true, only instantiate the slot contents when the map zoom is in range. If false,
           * the layers themselves will handle it. Usually you will want this to be false. */ enforce?: boolean;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type ZoomRangeProps = typeof __propDef.props;
export type ZoomRangeEvents = typeof __propDef.events;
export type ZoomRangeSlots = typeof __propDef.slots;
/**
 * Set `minzoom` and `maxzoom` for all components inside the slot. By default this only propagates the value
 * to the inner layers.
 *
 * You can set `enforce` to `true` to tear down the slot contents when the zoom
 * is outside the range. This is usually bad for performance, so it is not recommended for use with map layers,
 * but can have other uses such as creating and removing map controls or other behaviors depending on zoom level.
 */
export default class ZoomRange extends SvelteComponentTyped<ZoomRangeProps, ZoomRangeEvents, ZoomRangeSlots> {
}
export {};
