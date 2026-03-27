import { SvelteComponentTyped } from "svelte";
import maplibregl from 'maplibre-gl';
declare const __propDef: {
    props: {
        position?: maplibregl.ControlPosition;
        positionOptions?: PositionOptions | undefined;
        fitBoundsOptions?: maplibregl.FitBoundsOptions | undefined;
        trackUserLocation?: boolean;
        showAccuracyCircle?: boolean;
        showUserLocation?: boolean;
        control?: maplibregl.GeolocateControl | null;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type GeolocateControlProps = typeof __propDef.props;
export type GeolocateControlEvents = typeof __propDef.events;
export type GeolocateControlSlots = typeof __propDef.slots;
export default class GeolocateControl extends SvelteComponentTyped<GeolocateControlProps, GeolocateControlEvents, GeolocateControlSlots> {
}
export {};
