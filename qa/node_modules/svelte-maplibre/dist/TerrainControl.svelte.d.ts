import { SvelteComponentTyped } from "svelte";
import maplibregl from 'maplibre-gl';
declare const __propDef: {
    props: {
        position?: maplibregl.ControlPosition;
        source: string;
        exaggeration: number;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type TerrainControlProps = typeof __propDef.props;
export type TerrainControlEvents = typeof __propDef.events;
export type TerrainControlSlots = typeof __propDef.slots;
export default class TerrainControl extends SvelteComponentTyped<TerrainControlProps, TerrainControlEvents, TerrainControlSlots> {
}
export {};
