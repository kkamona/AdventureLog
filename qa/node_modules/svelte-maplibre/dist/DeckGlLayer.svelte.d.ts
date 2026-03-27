import { SvelteComponentTyped } from "svelte";
import { type DeckGlMouseEvent } from './context';
declare class __sveltets_Render<DATA> {
    props(): {
        [x: string]: any;
        id?: string | undefined;
        minzoom?: number | undefined;
        maxzoom?: number | undefined;
        visible?: boolean | undefined;
        pickable?: boolean | undefined;
        interactive?: boolean | undefined;
        hovered?: DATA | null | undefined;
        type: any;
        data: DATA[];
    };
    events(): {
        click: CustomEvent<DeckGlMouseEvent<DATA>>;
        mousemove: CustomEvent<DeckGlMouseEvent<DATA>>;
        mouseleave: CustomEvent<DeckGlMouseEvent<DATA>>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots(): {
        default: {};
    };
}
export type DeckGlLayerProps<DATA> = ReturnType<__sveltets_Render<DATA>['props']>;
export type DeckGlLayerEvents<DATA> = ReturnType<__sveltets_Render<DATA>['events']>;
export type DeckGlLayerSlots<DATA> = ReturnType<__sveltets_Render<DATA>['slots']>;
export default class DeckGlLayer<DATA> extends SvelteComponentTyped<DeckGlLayerProps<DATA>, DeckGlLayerEvents<DATA>, DeckGlLayerSlots<DATA>> {
}
export {};
