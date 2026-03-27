import { SvelteComponentTyped } from "svelte";
import type { Feature } from 'geojson';
import type { MarkerClickInfo } from './types';
declare const __propDef: {
    props: {
        applyToClusters?: boolean | undefined;
        filter?: maplibregl.ExpressionSpecification | undefined;
        /** How to calculate the coordinates of the marker.
           * @default Calls d3.geoCentroid` on the feature. */ markerLngLat?: (feature: Feature) => [number, number];
        /** Handle mouse events */ interactive?: boolean;
        /** Make markers tabbable and add the button role. */ asButton?: boolean;
        draggable?: boolean;
        minzoom?: number | undefined;
        maxzoom?: number | undefined;
        hovered?: Feature | null;
        /** The z-index of the markers. This can also be set via CSS classes using the `class` prop.
           * If a function is provided, it will be called with each feature as an argument. */ zIndex?: number | ((feature: GeoJSON.Feature) => number) | undefined;
        /** CSS classes to apply to each marker */ class?: string | undefined;
    };
    events: {
        click: CustomEvent<MarkerClickInfo & {
            source: string | null;
            feature: Feature<import("geojson").Geometry, import("geojson").GeoJsonProperties> & {
                id: string | number;
            };
        }>;
        dblclick: CustomEvent<MarkerClickInfo & {
            source: string | null;
            feature: Feature<import("geojson").Geometry, import("geojson").GeoJsonProperties> & {
                id: string | number;
            };
        }>;
        contextmenu: CustomEvent<MarkerClickInfo & {
            source: string | null;
            feature: Feature<import("geojson").Geometry, import("geojson").GeoJsonProperties> & {
                id: string | number;
            };
        }>;
        drag: CustomEvent<MarkerClickInfo & {
            source: string | null;
            feature: Feature<import("geojson").Geometry, import("geojson").GeoJsonProperties> & {
                id: string | number;
            };
        }>;
        dragstart: CustomEvent<MarkerClickInfo & {
            source: string | null;
            feature: Feature<import("geojson").Geometry, import("geojson").GeoJsonProperties> & {
                id: string | number;
            };
        }>;
        dragend: CustomEvent<MarkerClickInfo & {
            source: string | null;
            feature: Feature<import("geojson").Geometry, import("geojson").GeoJsonProperties> & {
                id: string | number;
            };
        }>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {
            feature: Feature<import("geojson").Geometry, import("geojson").GeoJsonProperties> & {
                id: string | number;
            };
            position: any;
        };
    };
};
export type MarkerLayerProps = typeof __propDef.props;
export type MarkerLayerEvents = typeof __propDef.events;
export type MarkerLayerSlots = typeof __propDef.slots;
/**
 * Manages a set of HTML markers for the features in a source.
 * This acts similar to a Layer component, but is not actually registered with
 * the map as a layer. Markers for non-point features are placed at the geometry's center.
 */
export default class MarkerLayer extends SvelteComponentTyped<MarkerLayerProps, MarkerLayerEvents, MarkerLayerSlots> {
}
export {};
