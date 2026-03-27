import { getContext, setContext } from 'svelte';
import { readable, writable } from 'svelte/store';
// Choose current time instead of 0 to avoid possible reuse during HMR.
export let nextId = Date.now();
/** Return an ID to use for a source or layer, in case you don't care about
 * the name. */
export function getId(prefix) {
    return `${prefix}-${nextId++}`;
}
const MAP_CONTEXT_KEY = Symbol.for('svelte-maplibre');
export function mapContext() {
    return getContext(MAP_CONTEXT_KEY);
}
export function setMapContext(context) {
    return setContext(MAP_CONTEXT_KEY, context);
}
function eventTopMost(layerInfo) {
    let tracker = new WeakMap();
    return (event) => {
        let id = tracker.get(event.originalEvent);
        if (id !== undefined) {
            return id;
        }
        let features = event.target.queryRenderedFeatures(event.point);
        let topId = features.find((f) => layerInfo.get(f.layer.id)?.interactive)?.layer.id;
        tracker.set(event.originalEvent, topId);
        return topId;
    };
}
export function createMapContext() {
    let layerInfo = new Map();
    return setContext(MAP_CONTEXT_KEY, {
        map: writable(null),
        source: readable(null),
        layer: readable(null),
        popupTarget: readable(null),
        cluster: writable(),
        loadedImages: writable(new Set()),
        minzoom: writable(0),
        maxzoom: writable(24),
        layerEvent: writable(null),
        layerInfo,
        eventTopMost: eventTopMost(layerInfo),
        markerClickManager: new MarkerClickManager(),
    });
}
/** Make sure inner components can't accidentally change their parent stores. */
function readableFromWritable(writable) {
    return {
        subscribe: writable.subscribe,
    };
}
/** Replace one or more elements of the map context with a new store. */
function updatedContext({ key, setPopupTarget = false, setCluster = false, setMouseEvent = false, }) {
    let currentContext = mapContext();
    let newValue = writable(null);
    let ctxValue = readableFromWritable(newValue);
    let newCtx = {
        ...currentContext,
        [key]: readableFromWritable(newValue),
    };
    if (setPopupTarget) {
        // This type also becomes a popup target in addition to whatever else it was.
        newCtx.popupTarget = ctxValue;
    }
    if (setMouseEvent) {
        let layerEvent = writable(null);
        newCtx.layerEvent = layerEvent;
        currentContext.layerEvent = layerEvent;
    }
    if (setCluster) {
        newCtx.cluster = writable();
    }
    setContext(MAP_CONTEXT_KEY, newCtx);
    return {
        ...currentContext,
        self: newValue,
    };
}
export function updatedSourceContext() {
    return updatedContext({ key: 'source', setCluster: true });
}
export function updatedLayerContext(interactive = true) {
    return updatedContext({
        key: 'layer',
        setPopupTarget: interactive,
        setMouseEvent: interactive,
    });
}
export function updatedDeckGlContext() {
    return updatedContext({ key: 'layer', setMouseEvent: true });
}
export function updatedMarkerContext() {
    return updatedContext({ key: 'popupTarget', setPopupTarget: true, setMouseEvent: true });
}
export function updatedZoomRangeContext(initialMinZoom, initialMaxZoom) {
    let currentContext = mapContext();
    let minzoom = writable(initialMinZoom);
    let maxzoom = writable(initialMaxZoom);
    setContext(MAP_CONTEXT_KEY, {
        ...currentContext,
        minzoom: readableFromWritable(minzoom),
        maxzoom: readableFromWritable(maxzoom),
    });
    return {
        originalMinZoom: currentContext.minzoom,
        originalMaxZoom: currentContext.maxzoom,
        minzoom,
        maxzoom,
    };
}
export function isDeckGlMouseEvent(event) {
    return 'layerType' in event && event.layerType === 'deckgl';
}
class MarkerClickManager {
    _handlers = new Set();
    add(markerClickInfo) {
        this._handlers.add(markerClickInfo);
    }
    remove(markerClickInfo) {
        this._handlers.delete(markerClickInfo);
    }
    handleClick(event) {
        for (const handler of this._handlers) {
            handler(event);
        }
    }
}
