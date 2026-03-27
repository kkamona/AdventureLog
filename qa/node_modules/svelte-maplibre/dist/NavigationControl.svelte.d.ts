import { SvelteComponentTyped } from "svelte";
import maplibregl from 'maplibre-gl';
declare const __propDef: {
    props: {
        position?: maplibregl.ControlPosition;
        showCompass?: boolean;
        showZoom?: boolean;
        visualizePitch?: boolean;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type NavigationControlProps = typeof __propDef.props;
export type NavigationControlEvents = typeof __propDef.events;
export type NavigationControlSlots = typeof __propDef.slots;
export default class NavigationControl extends SvelteComponentTyped<NavigationControlProps, NavigationControlEvents, NavigationControlSlots> {
}
export {};
