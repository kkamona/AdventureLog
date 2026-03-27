import { SvelteComponentTyped } from "svelte";
import type { Coordinates } from 'maplibre-gl';
declare const __propDef: {
    props: {
        id?: string;
        url: string;
        coordinates: Coordinates;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type ImageSourceProps = typeof __propDef.props;
export type ImageSourceEvents = typeof __propDef.events;
export type ImageSourceSlots = typeof __propDef.slots;
export default class ImageSource extends SvelteComponentTyped<ImageSourceProps, ImageSourceEvents, ImageSourceSlots> {
}
export {};
