import type { Folder, Bookmark } from '../types';

/**
 * Utilities for smart path canonicalization and standardization.
 */

/**
 * Normalizes a folder name for comparison (lowercase, trimmed).
 */
export const normalizeName = (name: string): string => name.toLowerCase().trim();

/**
 * Gets a unique signature for a path that is order-independent.
 * e.g., ["Tools", "AI"] and ["AI", "Tools"] both result in "ai|tools"
 */
export const getPathSignature = (path: string[]): string => {
    return [...path]
        .map(normalizeName)
        .sort()
        .join('|');
};

/**
 * Finds all unique paths (arrays of folder names) in a folder tree.
 */
export const getAllExistingPaths = (nodes: (Folder | Bookmark)[], currentPath: string[] = []): string[][] => {
    let paths: string[][] = [];
    
    nodes.forEach(node => {
        if (!('url' in node)) { // It's a folder
            const path = [...currentPath, node.name];
            paths.push(path);
            if (node.children && node.children.length > 0) {
                paths = [...paths, ...getAllExistingPaths(node.children, path)];
            }
        }
    });
    
    return paths;
};

/**
 * Standardizes a proposed path against a set of existing paths.
 * 
 * Strategy:
 * 1. Check for exact matches (Case insensitive).
 * 2. Check for permutations (Same components, different order).
 * 3. Longest Matching Hierarchy: Find the longest existing path whose components 
 *    all exist in the proposed path, and use it as the prefix.
 */
export const standardizePath = (
    proposedPath: string[], 
    existingPaths: string[][]
): string[] => {
    if (!proposedPath || proposedPath.length === 0) return [];

    const normalizedProposed = proposedPath.map(normalizeName);
    const proposedSig = getPathSignature(proposedPath);

    // 1. Check for exact or permutation matches in existing tree
    for (const existingPath of existingPaths) {
        if (existingPath.length === proposedPath.length) {
            const existingSig = getPathSignature(existingPath);
            if (proposedSig === existingSig) {
                // It's a match or a permutation. Return the existing one to preserve order.
                return existingPath;
            }
        }
    }

    // 2. Longest Matching Hierarchy Strategy
    // Find an existing path where all its components are present in the proposed path.
    // We want the longest such path to preserve as much existing structure as possible.
    let bestMatch: string[] | null = null;

    for (const existingPath of existingPaths) {
        const normalizedExisting = existingPath.map(normalizeName);
        
        // Check if all components of existingPath are in proposedPath
        const allComponentsPresent = normalizedExisting.every(comp => 
            normalizedProposed.includes(comp)
        );

        if (allComponentsPresent) {
            if (!bestMatch || existingPath.length > bestMatch.length) {
                bestMatch = existingPath;
            }
        }
    }

    if (bestMatch) {
        const normalizedBestMatch = bestMatch.map(normalizeName);
        // Create the standardized path: [Best Match Components] + [Remaining Proposed Components]
        const remaining = proposedPath.filter(comp => 
            !normalizedBestMatch.includes(normalizeName(comp))
        );
        return [...bestMatch, ...remaining];
    }

    return proposedPath;
};
