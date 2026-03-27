import { SvelteComponentTyped } from "svelte";
import maplibre, { type LngLatLike, type PointLike } from 'maplibre-gl';
import type { MarkerClickInfo } from './types';
import type * as GeoJSON from 'geojson';
declare const __propDef: {
    props: {
        /** The Marker instance which was added to the map */ marker?: maplibre.Marker | undefined;
        lngLat: LngLatLike;
        class?: string | undefined;
        /** Handle mouse events */ draggable?: boolean;
        /** A GeoJSON Feature related to the point. This is only actually used to send an ID and set of properties along with
           * the event, and can be safely omitted. The `lngLat` prop controls the marker's location even if this is provided. */ feature?: GeoJSON.Feature | null;
        /** An offset in pixels to apply to the marker. */ offset?: PointLike | undefined;
        /** The rotation angle of the marker (clockwise, in degrees) */ rotation?: number;
        /** The opacity of the marker */ opacity?: number;
    };
    events: {
        drag: CustomEvent<MarkerClickInfo>;
        dragstart: CustomEvent<MarkerClickInfo>;
        dragend: CustomEvent<MarkerClickInfo>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {
            marker: maplibre.Marker;
        };
    };
};
export type DefaultMarkerProps = typeof __propDef.props;
export type DefaultMarkerEvents = typeof __propDef.events;
export type DefaultMarkerSlots = typeof __propDef.slots;
export default class DefaultMarker extends SvelteComponentTyped<DefaultMarkerProps, DefaultMarkerEvents, DefaultMarkerSlots> {
}
export {};
