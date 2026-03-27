import type { Map as MapLibre, MapMouseEvent, Marker } from 'maplibre-gl';
import { type Readable, type Writable } from 'svelte/store';
import type { ClusterOptions, MarkerClickInfo } from './types';
export declare let nextId: number;
/** Return an ID to use for a source or layer, in case you don't care about
 * the name. */
export declare function getId(prefix: string): string;
export interface LayerInfo {
    interactive: boolean;
}
export interface MapContext {
    map: Readable<MapLibre | null>;
    source: Readable<string | null>;
    layer: Readable<string | null>;
    cluster: Writable<ClusterOptions | undefined>;
    popupTarget: Readable<Marker | string | null>;
    /** A list of images that have been successfully loaded. */
    loadedImages: Writable<Set<string>>;
    minzoom: Writable<number>;
    maxzoom: Writable<number>;
    layerInfo: Map<string, LayerInfo>;
    eventTopMost: (event: MapMouseEvent) => string;
    layerEvent: Writable<LayerEvent | null>;
    /** Subscribe to marker clicks globally. Marker clicks intentionally do not propagate their events
     * to the map, but some internal components such as Popups need to know when any click happens, on the
     * map or on a marker, and MarkerClickManager facilitates that functionality. */
    markerClickManager: MarkerClickManager;
}
export type MarkerMouseEvent = MarkerClickInfo & {
    layerType: 'marker';
    type: string;
};
export interface DeckGlMouseEvent<DATA = unknown> {
    layerType: 'deckgl';
    type: 'click' | 'mouseenter' | 'mouseleave';
    coordinate: [number, number];
    object?: DATA;
    index: number;
    picked: boolean;
    color: Uint8Array | null;
    pixel: [number, number];
    x: number;
    y: number;
}
export type LayerEvent = DeckGlMouseEvent<unknown> | MarkerMouseEvent;
export declare function mapContext(): MapContext;
export declare function setMapContext(context: MapContext): MapContext;
export declare function createMapContext(): MapContext;
export interface UpdatedContext<TYPE> extends MapContext {
    self: Writable<TYPE | null>;
}
export declare function updatedSourceContext(): UpdatedContext<string>;
export declare function updatedLayerContext(interactive?: boolean): UpdatedContext<string>;
export declare function updatedDeckGlContext(): UpdatedContext<string>;
export declare function updatedMarkerContext(): UpdatedContext<Marker>;
export declare function updatedZoomRangeContext(initialMinZoom: number | undefined, initialMaxZoom: number | undefined): {
    originalMinZoom: Writable<number>;
    originalMaxZoom: Writable<number>;
    minzoom: Writable<number>;
    maxzoom: Writable<number>;
};
export declare function isDeckGlMouseEvent(event: MapMouseEvent | DeckGlMouseEvent): event is DeckGlMouseEvent<unknown>;
type MarkerClickCallback = (event: MarkerClickInfo) => void;
declare class MarkerClickManager {
    private _handlers;
    add(markerClickInfo: MarkerClickCallback): void;
    remove(markerClickInfo: MarkerClickCallback): void;
    handleClick(event: MarkerClickInfo): void;
}
export {};
