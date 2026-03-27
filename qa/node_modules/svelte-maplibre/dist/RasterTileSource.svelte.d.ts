import { SvelteComponentTyped } from "svelte";
import type { Scheme } from './types.js';
declare const __propDef: {
    props: {
        id?: string;
        /** An array one or more tile source URLs pointing to the tiles.
           * Either `tiles` or `url` must be provided. */ tiles?: string[] | undefined;
        tileSize?: number | undefined;
        /** A single URL pointing to a PMTiles archive. Either `tiles` or `url` must be provided. */ url?: string | undefined;
        bounds?: Array<number> | null;
        scheme?: Scheme | null;
        attribution?: string | null;
        minzoom?: number | null;
        maxzoom?: number | null;
        volatile?: boolean | null;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type RasterTileSourceProps = typeof __propDef.props;
export type RasterTileSourceEvents = typeof __propDef.events;
export type RasterTileSourceSlots = typeof __propDef.slots;
export default class RasterTileSource extends SvelteComponentTyped<RasterTileSourceProps, RasterTileSourceEvents, RasterTileSourceSlots> {
}
export {};
