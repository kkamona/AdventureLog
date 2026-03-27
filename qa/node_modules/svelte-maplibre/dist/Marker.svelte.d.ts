import { SvelteComponentTyped } from "svelte";
import maplibre, { type LngLatLike, type PointLike } from 'maplibre-gl';
import type { MarkerClickInfo } from './types';
import type * as GeoJSON from 'geojson';
declare const __propDef: {
    props: {
        /** The Marker instance which was added to the map */ marker?: maplibre.Marker | undefined;
        lngLat: LngLatLike;
        class?: string | undefined;
        /** Handle mouse events */ interactive?: boolean;
        /** Make markers tabbable and add the button role. */ asButton?: boolean;
        draggable?: boolean;
        /** A GeoJSON Feature related to the point. This is only actually used to send an ID and set of properties along with
           * the event, and can be safely omitted. The `lngLat` prop controls the marker's location even if this is provided. */ feature?: GeoJSON.Feature | null;
        /** An offset in pixels to apply to the marker. */ offset?: PointLike | undefined;
        /** The z-index of the marker. This can also be set via CSS classes using the `class` prop */ zIndex?: number | undefined;
        /** The rotation angle of the marker (clockwise, in degrees) */ rotation?: number;
        /** The opacity of the marker */ opacity?: number;
    };
    events: {
        drag: CustomEvent<MarkerClickInfo>;
        dragstart: CustomEvent<MarkerClickInfo>;
        dragend: CustomEvent<MarkerClickInfo>;
        click: CustomEvent<MarkerClickInfo>;
        dblclick: CustomEvent<MarkerClickInfo>;
        contextmenu: CustomEvent<MarkerClickInfo>;
        mouseenter: CustomEvent<MarkerClickInfo>;
        mouseleave: CustomEvent<MarkerClickInfo>;
        mousemove: CustomEvent<MarkerClickInfo>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {
            marker: maplibre.Marker | null;
        };
    };
};
export type MarkerProps = typeof __propDef.props;
export type MarkerEvents = typeof __propDef.events;
export type MarkerSlots = typeof __propDef.slots;
export default class Marker extends SvelteComponentTyped<MarkerProps, MarkerEvents, MarkerSlots> {
}
export {};
