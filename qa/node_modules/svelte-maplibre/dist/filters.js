export function combineFilters(join, ...filters) {
    let outputFilters = [join];
    for (let fil of filters) {
        if (!fil) {
            continue;
        }
        else if (Array.isArray(fil)) {
            if (fil[0] === join) {
                // Simplify the filter if this filter is already a join of the same type.
                outputFilters.push(...fil.slice(1));
            }
            else {
                outputFilters.push(fil);
            }
        }
        else {
            outputFilters.push(fil);
        }
    }
    if (outputFilters.length === 1) {
        return undefined;
    }
    else if (outputFilters.length === 2) {
        return outputFilters[1];
    }
    return outputFilters;
}
/** Return an expression that returns a value based on whether the feature is a cluster or an individual point. */
export function isClusterFilter(matchClusters) {
    return matchClusters === true
        ? ['has', 'point_count']
        : matchClusters === false
            ? ['!', ['has', 'point_count']]
            : undefined;
}
/** Return an expression that returns a value based on whether the feature is hovered. Requires manageHoverState to be enabled for the layer. */
export function hoverStateFilter(defaultValue, hoverValue) {
    return ['case', ['boolean', ['feature-state', 'hover'], false], hoverValue, defaultValue];
}
/** A function that returns if a layer is a text layer, and optionally if it belongs to a particular source. */
export function isTextLayer(layer, source) {
    return (layer.type === 'symbol' &&
        (!source || layer.source === source) &&
        !!layer.layout?.['text-field']);
}
