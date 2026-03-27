import { SvelteComponentTyped } from "svelte";
import maplibregl from 'maplibre-gl';
declare const __propDef: {
    props: {
        /** Limit the event handlers to a certain layer. */ layer?: string | undefined;
    };
    events: {
        click: CustomEvent<maplibregl.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        dblclick: CustomEvent<maplibregl.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        contextmenu: CustomEvent<maplibregl.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        movestart: CustomEvent<maplibregl.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        moveend: CustomEvent<maplibregl.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        zoomstart: CustomEvent<maplibregl.MapLibreZoomEvent & {
            map: maplibregl.Map;
        }>;
        zoom: CustomEvent<maplibregl.MapLibreZoomEvent & {
            map: maplibregl.Map;
        }>;
        zoomend: CustomEvent<maplibregl.MapLibreZoomEvent & {
            map: maplibregl.Map;
        }>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type MapEventsProps = typeof __propDef.props;
export type MapEventsEvents = typeof __propDef.events;
export type MapEventsSlots = typeof __propDef.slots;
export default class MapEvents extends SvelteComponentTyped<MapEventsProps, MapEventsEvents, MapEventsSlots> {
}
export {};
