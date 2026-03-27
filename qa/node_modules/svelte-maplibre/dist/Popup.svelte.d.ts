import { SvelteComponentTyped } from "svelte";
import type { Feature } from 'geojson';
import maplibregl from 'maplibre-gl';
declare const __propDef: {
    props: {
        /** Show the built-in close button. By default the close button will be shown
           * only if closeOnClickOutside and closeOnClickInside are not set. */ closeButton?: boolean | undefined;
        /** Close on click outside the popup. */ closeOnClickOutside?: boolean;
        /** Close on click inside the popup. This should only be used for non-interactive popups. */ closeOnClickInside?: boolean;
        /** Close the popup when the map moves. */ closeOnMove?: boolean;
        /** Define when to open the popup. If set to manual, you can open the popup programmatically by
           * setting the `open` attribute. */ openOn?: "hover" | "click" | "dblclick" | "contextmenu" | "manual";
        /** Only open the popup if there's no feature from a higher layer covering this one. */ openIfTopMost?: boolean;
        focusAfterOpen?: boolean;
        anchor?: maplibregl.PositionAnchor | undefined;
        offset?: maplibregl.Offset | undefined;
        /** Classes to apply to the map's popup container */ popupClass?: string | undefined;
        maxWidth?: string | undefined;
        /** Where to show the popup. */ lngLat?: maplibregl.LngLatLike | undefined;
        /** If set and the slot is omitted, use this string as HTML to pass into the popup. */ html?: string | undefined;
        /** Whether the popup is open or not. Can be set to manualy open the popup at `lngLat`. */ open?: boolean;
    };
    events: {
        open: CustomEvent<maplibregl.Popup>;
        close: CustomEvent<maplibregl.Popup>;
        hover: CustomEvent<maplibregl.Popup>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {
            features: Array<Feature> | null;
            data: Feature | null;
            map: maplibregl.Map | null;
            close: () => void;
        };
    };
};
export type PopupProps = typeof __propDef.props;
export type PopupEvents = typeof __propDef.events;
export type PopupSlots = typeof __propDef.slots;
export default class Popup extends SvelteComponentTyped<PopupProps, PopupEvents, PopupSlots> {
}
export {};
