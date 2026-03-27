import { SvelteComponentTyped } from "svelte";
import type { DEMEncoding } from 'maplibre-gl';
declare const __propDef: {
    props: {
        id?: string;
        tiles: string[];
        tileSize?: number | undefined;
        bounds?: Array<number> | null;
        attribution?: string | null;
        minzoom?: number | null;
        maxzoom?: number | null;
        volatile?: boolean | null;
        encoding?: DEMEncoding | null;
        redFactor?: number | null;
        greenFactor: number | null;
        blueFactor: number | null;
        baseShift: number | null;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type RasterDemTileSourceProps = typeof __propDef.props;
export type RasterDemTileSourceEvents = typeof __propDef.events;
export type RasterDemTileSourceSlots = typeof __propDef.slots;
export default class RasterDemTileSource extends SvelteComponentTyped<RasterDemTileSourceProps, RasterDemTileSourceEvents, RasterDemTileSourceSlots> {
}
export {};
