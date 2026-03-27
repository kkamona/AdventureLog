import { SvelteComponentTyped } from "svelte";
import type { Scheme } from './types.js';
declare const __propDef: {
    props: {
        id?: string;
        url?: string | null;
        tiles?: Array<string> | null;
        promoteId?: string | null;
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
export type VectorTileSourceProps = typeof __propDef.props;
export type VectorTileSourceEvents = typeof __propDef.events;
export type VectorTileSourceSlots = typeof __propDef.slots;
export default class VectorTileSource extends SvelteComponentTyped<VectorTileSourceProps, VectorTileSourceEvents, VectorTileSourceSlots> {
}
export {};
