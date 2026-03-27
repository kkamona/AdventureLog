import type { Map, SourceSpecification } from 'maplibre-gl';
import { type Readable } from 'svelte/store';
/**
 * Add a source to the map.
 *
 * @param map - The map instance
 * @param sourceId - The ID of the source to add
 * @param source - The source specification object
 * @param okToAdd - Callback to check if the source should still be added
 * @param cb - Callback when the source has been added
 *
 * This properly handles the case where an old source with the same ID is still being removed.
 */
export declare function addSource(map: Map, sourceId: string, source: SourceSpecification, okToAdd: (sourceId: string) => boolean, cb: () => void): void;
/**
 * A helper function that removes a source from the map after all of the layers inside it have
 * had a chance to remove themselves.
 *
 * @param {Readable<Map|null>} mapStore - The store containing the Map instance
 * @param {string} sourceId - The ID of the source to remove
 * @param {unknown} sourceObj - The source object that was originally added
 *
 * Waits one tick to ensure layers have a chance to be removed, then checks if the
 * source with the given ID is still the same object as was originally added.
 *
 * If so, it removes the source from the map. This avoids removing a source that was
 * already replaced by another source reusing the same ID.
 */
export declare function removeSource(mapStore: Readable<Map | null>, sourceId: string, sourceObj: unknown): void;
