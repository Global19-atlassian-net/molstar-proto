/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { StructureElement } from './structure'
import { Link } from './structure/structure/unit/links'
import { Shape } from './shape';

/** A Loci that includes every loci */
export const EveryLoci = { kind: 'every-loci' as 'every-loci' }
export type EveryLoci = typeof EveryLoci
export function isEveryLoci(x: any): x is EveryLoci {
    return !!x && x.kind === 'every-loci';
}

/** A Loci that is empty */
export const EmptyLoci = { kind: 'empty-loci' as 'empty-loci' }
export type EmptyLoci = typeof EmptyLoci
export function isEmptyLoci(x: any): x is EmptyLoci {
    return !!x && x.kind === 'empty-loci';
}

export function areLociEqual(lociA: Loci, lociB: Loci) {
    if (isEveryLoci(lociA) && isEveryLoci(lociB)) return true
    if (isEmptyLoci(lociA) && isEmptyLoci(lociB)) return true
    if (StructureElement.isLoci(lociA) && StructureElement.isLoci(lociB)) {
        return StructureElement.areLociEqual(lociA, lociB)
    }
    if (Link.isLoci(lociA) && Link.isLoci(lociB)) {
        return Link.areLociEqual(lociA, lociB)
    }
    if (Shape.isLoci(lociA) && Shape.isLoci(lociB)) {
        return Shape.areLociEqual(lociA, lociB)
    }
    return false
}

export type Loci =  StructureElement.Loci | Link.Loci | EveryLoci | EmptyLoci | Shape.Loci