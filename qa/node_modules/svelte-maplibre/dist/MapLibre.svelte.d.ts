import { SvelteComponentTyped } from "svelte";
import maplibre, { type LngLatBoundsLike, type LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CustomImageSpec } from './types.js';
declare const __propDef: {
    props: {
        map?: maplibregl.Map | null;
        /** The `div` element that the Map is placed into. You can bind to this prop to access the element for yourself.
           * Setting it externally will have no effect. */ mapContainer?: HTMLDivElement | undefined;
        class?: string | undefined;
        /** The style to use for the map. */ style: string | maplibregl.StyleSpecification;
        /** Tell MapLibre to update the map in place when changing the style, diffing the old style against the new one to
           * make minimal changes. If you enable this, be aware of https://github.com/maplibre/maplibre-gl-js/issues/2651,
           * which may prevent some style changes from becoming visible when diffing is enabled. */ diffStyleUpdates?: boolean;
        center?: LngLatLike | undefined;
        zoom?: number | undefined;
        pitch?: number;
        bearing?: number;
        bounds?: LngLatBoundsLike | undefined;
        /** Set to true to track the map viewport in the URL hash. If the URL hash is set, that overrides initial viewport settings. */ hash?: boolean;
        /** Update the URL when the hash changes, if `hash` is true.
           * The default behavior uses `window.history.replaceState`. For SvelteKit, you should
           *  `import { replaceState } from '$app/navigation';` and pass something like
           *  `updateHash={(u) => replaceState(u, $page.state)}` when instantiating the map.
           */ updateHash?: (url: URL) => void;
        loaded?: boolean;
        minZoom?: number;
        maxZoom?: number;
        minPitch?: number | undefined;
        maxPitch?: number | undefined;
        renderWorldCopies?: boolean | undefined;
        dragPan?: boolean | undefined;
        dragRotate?: boolean | undefined;
        pitchWithRotate?: boolean | undefined;
        antialias?: boolean | undefined;
        zoomOnDoubleClick?: boolean;
        /** Override MapLibre's default locale table */ locale?: any;
        interactive?: boolean;
        /** Set false to hide the default attribution control, so you can add your own. */ attributionControl?: boolean;
        /** Set true to require hitting ⌘/Ctrl while scrolling to zoom. Or use two fingers on phones. */ cooperativeGestures?: boolean;
        /** Set to true if you want to export the map as an image */ preserveDrawingBuffer?: boolean;
        maxBounds?: LngLatBoundsLike | undefined;
        /** Custom images to load into the map. */ images?: CustomImageSpec[];
        /** Set to true or a position to add all the standard controls. */ standardControls?: boolean | maplibregl.ControlPosition;
        /** Filter the map's builtin layers, hiding any for which this function returns false. */ filterLayers?: ((layer: maplibregl.LayerSpecification) => boolean) | undefined;
        /** Function that modifies requests, such as by adding an API key. **/ transformRequest?: maplibregl.RequestTransformFunction | undefined;
    };
    events: {
        load: CustomEvent<maplibre.Map>;
        error: CustomEvent<Error>;
        click: CustomEvent<maplibre.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        dblclick: CustomEvent<maplibre.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        contextmenu: CustomEvent<maplibre.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        movestart: CustomEvent<maplibre.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        moveend: CustomEvent<maplibre.MapMouseEvent & {
            map: maplibregl.Map;
        }>;
        zoomstart: CustomEvent<maplibre.MapLibreZoomEvent & {
            map: maplibregl.Map;
        }>;
        zoom: CustomEvent<maplibre.MapLibreZoomEvent & {
            map: maplibregl.Map;
        }>;
        zoomend: CustomEvent<maplibre.MapLibreZoomEvent & {
            map: maplibregl.Map;
        }>;
        styledata: CustomEvent<maplibre.MapLibreEvent<unknown> & {
            dataType: "style";
        } & {
            map: maplibregl.Map;
        }>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {
            map: maplibregl.Map;
            loadedImages: Set<string>;
            allImagesLoaded: boolean;
        };
    };
};
export type MapLibreProps = typeof __propDef.props;
export type MapLibreEvents = typeof __propDef.events;
export type MapLibreSlots = typeof __propDef.slots;
export default class MapLibre extends SvelteComponentTyped<MapLibreProps, MapLibreEvents, MapLibreSlots> {
}
export {};
