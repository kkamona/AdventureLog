import type { ExpressionSpecification } from 'maplibre-gl';
export declare function combineFilters(join: 'all' | 'any', ...filters: (ExpressionSpecification | null | undefined)[]): ExpressionSpecification | undefined;
/** Return an expression that returns a value based on whether the feature is a cluster or an individual point. */
export declare function isClusterFilter(matchClusters: boolean | undefined): ExpressionSpecification | undefined;
/** Return an expression that returns a value based on whether the feature is hovered. Requires manageHoverState to be enabled for the layer. */
export declare function hoverStateFilter(defaultValue: string | number | boolean, hoverValue: string | number | boolean): ExpressionSpecification;
/** A function that returns if a layer is a text layer, and optionally if it belongs to a particular source. */
export declare function isTextLayer(layer: maplibregl.LayerSpecification, source?: string): boolean;
