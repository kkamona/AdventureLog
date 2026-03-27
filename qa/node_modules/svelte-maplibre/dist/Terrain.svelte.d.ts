import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        source?: string | undefined;
        exaggeration?: number | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type TerrainProps = typeof __propDef.props;
export type TerrainEvents = typeof __propDef.events;
export type TerrainSlots = typeof __propDef.slots;
export default class Terrain extends SvelteComponentTyped<TerrainProps, TerrainEvents, TerrainSlots> {
}
export {};
