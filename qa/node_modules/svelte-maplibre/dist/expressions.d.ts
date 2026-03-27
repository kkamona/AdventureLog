import type { ExpressionSpecification } from 'maplibre-gl';
/** Use an image loaded into the map, falling back to another image if it does not exist. */
export declare function imageWithFallback(imageId: string | ExpressionSpecification, fallbackId: string): ExpressionSpecification;
/** Create an interpolation that changes with the map's zoom level. */
export declare function zoomTransition(start: number, startValue: number | ExpressionSpecification, end: number, endValue: number | ExpressionSpecification): ExpressionSpecification;
