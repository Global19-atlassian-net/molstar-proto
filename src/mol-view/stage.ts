/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import Viewer from './viewer'
import { StateContext } from './state/context';
import { Progress } from 'mol-task';
import { MmcifUrlToModel, ModelToStructure, StructureToSpacefill, StructureToBallAndStick, StructureToDistanceRestraint, StructureToCartoon, StructureToBackbone, StructureCenter, StructureToCarbohydrate } from './state/transform';
import { UrlEntity } from './state/entity';
import { SpacefillProps } from 'mol-geo/representation/structure/representation/spacefill';
import { Context } from 'mol-app/context/context';
import { BallAndStickProps } from 'mol-geo/representation/structure/representation/ball-and-stick';
import { CartoonProps } from 'mol-geo/representation/structure/representation/cartoon';
import { DistanceRestraintProps } from 'mol-geo/representation/structure/representation/distance-restraint';
import { BackboneProps } from 'mol-geo/representation/structure/representation/backbone';
import { CarbohydrateProps } from 'mol-geo/representation/structure/representation/carbohydrate';
// import { Queries as Q, StructureProperties as SP, Query, Selection } from 'mol-model/structure';

const spacefillProps: Partial<SpacefillProps> = {
    doubleSided: true,
    colorTheme: { name: 'chain-id' },
    sizeTheme: { name: 'physical', factor: 1.0 },
    quality: 'auto',
    useFog: false
}

const ballAndStickProps: Partial<BallAndStickProps> = {
    doubleSided: true,
    colorTheme: { name: 'chain-id' },
    sizeTheme: { name: 'uniform', value: 0.15 },
    quality: 'auto',
    useFog: false
}

const distanceRestraintProps: Partial<DistanceRestraintProps> = {
    doubleSided: true,
    colorTheme: { name: 'cross-link' },
    sizeTheme: { name: 'uniform', value: 0.6 },
    quality: 'auto',
    useFog: false
}

const backboneProps: Partial<BackboneProps> = {
    doubleSided: true,
    colorTheme: { name: 'chain-id' },
    sizeTheme: { name: 'uniform', value: 0.3 },
    quality: 'auto',
    useFog: false,
    alpha: 0.5
}

const cartoonProps: Partial<CartoonProps> = {
    doubleSided: true,
    colorTheme: { name: 'chain-id' },
    sizeTheme: { name: 'uniform', value: 0.13, factor: 1 },
    aspectRatio: 8,
    quality: 'auto',
    useFog: false
}

const carbohydrateProps: Partial<CarbohydrateProps> = {
    doubleSided: true,
    colorTheme: { name: 'carbohydrate-symbol' },
    sizeTheme: { name: 'uniform', value: 1, factor: 1 },
    quality: 'highest',
    useFog: false
}

export class Stage {
    viewer: Viewer
    ctx = new StateContext(Progress.format)

    constructor(public globalContext: Context) {

    }

    initRenderer (canvas: HTMLCanvasElement, container: HTMLDivElement) {
        this.viewer = Viewer.create(canvas, container)
        this.viewer.animate()
        this.ctx.viewer = this.viewer

        // this.loadPdbid('1jj2')
        // this.loadPdbid('1grm') // helix-like sheets
        // this.loadPdbid('4umt') // ligand has bond with order 3
        // this.loadPdbid('1crn') // small
        // this.loadPdbid('1hrv') // viral assembly
        // this.loadPdbid('1rb8') // virus
        // this.loadPdbid('1blu') // metal coordination
        // this.loadPdbid('3pqr') // inter unit bonds, two polymer chains, ligands, water, carbohydrates linked to protein
        // this.loadPdbid('4v5a') // ribosome
        // this.loadPdbid('3j3q') // ...
        // this.loadPdbid('2np2') // dna
        // this.loadPdbid('1d66') // dna
        // this.loadPdbid('9dna') // A form dna
        // this.loadPdbid('1bna') // B form dna
        // this.loadPdbid('199d') // C form dna
        // this.loadPdbid('4lb6') // Z form dna
        // this.loadPdbid('1egk') // 4-way dna-rna junction
        // this.loadPdbid('1y26') // rna
        // this.loadPdbid('1xv6') // rna, modified nucleotides
        // this.loadPdbid('3bbm') // rna with linker
        // this.loadPdbid('1euq') // t-rna
        // this.loadPdbid('2e2i') // rna, dna, protein
        // this.loadPdbid('1gfl') // GFP, flourophore has carbonyl oxygen removed
        // this.loadPdbid('1sfi') // contains cyclic peptid
        // this.loadPdbid('3sn6') // discontinuous chains
        // this.loadPdbid('2zex') // contains carbohydrate polymer
        // this.loadPdbid('3sgj') // contains carbohydrate polymer
        // this.loadPdbid('3ina') // contains GlcN and IdoA
        // this.loadPdbid('1umz') // contains Xyl (Xyloglucan)
        // this.loadPdbid('1mfb') // contains Abe
        // this.loadPdbid('2gdu') // contains sucrose
        // this.loadPdbid('2fnc') // contains maltotriose
        // this.loadPdbid('4zs9') // contains raffinose
        // this.loadPdbid('2yft') // contains kestose
        // this.loadPdbid('2b5t') // contains large carbohydrate polymer
        // this.loadPdbid('1b5f') // contains carbohydrate with alternate locations
        // this.loadMmcifUrl(`../../examples/1cbs_full.bcif`)
        // this.loadMmcifUrl(`../../examples/1cbs_updated.cif`)
        // this.loadMmcifUrl(`../../examples/1crn.cif`)
        // this.loadPdbid('5u0q') // mixed dna/rna in same polymer
        // this.loadPdbid('1xj9') // PNA (peptide nucleic acid)
        // this.loadPdbid('5eme') // PNA (peptide nucleic acid) and RNA
        this.loadPdbid('2X3T') // temp

        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000001.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000002.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000003.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000004.cif`) // TODO issue with cross-link extraction, not shown
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000005.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000006.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000007.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000008.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000009.cif`) // TODO sequence related error
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000010.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000011.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000012.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000014.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000015.cif`) // TODO sequence related error
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000016.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000017.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000020.cif`) // ok
        // this.loadMmcifUrl(`../../../test/pdb-dev/PDBDEV_00000021.cif`) // ok
    }

    async loadMmcifUrl (url: string) {
        const urlEntity = UrlEntity.ofUrl(this.ctx, url)
        const modelEntity = await MmcifUrlToModel.apply(this.ctx, urlEntity)
        const structureEntity = await ModelToStructure.apply(this.ctx, modelEntity)

        StructureToBallAndStick.apply(this.ctx, structureEntity, { ...ballAndStickProps, visible: true })
        StructureToSpacefill.apply(this.ctx, structureEntity, { ...spacefillProps, visible: false })
        StructureToDistanceRestraint.apply(this.ctx, structureEntity, { ...distanceRestraintProps, visible: true })
        StructureToBackbone.apply(this.ctx, structureEntity, { ...backboneProps, visible: false })
        StructureToCartoon.apply(this.ctx, structureEntity, { ...cartoonProps, visible: true })
        StructureToCarbohydrate.apply(this.ctx, structureEntity, { ...carbohydrateProps, visible: true })
        StructureCenter.apply(this.ctx, structureEntity)

        this.globalContext.components.sequenceView.setState({ structure: structureEntity.value });

        // const structureEntity2 = await ModelToStructure.apply(this.ctx, modelEntity)
        // const q1 = Q.generators.atoms({
        //     residueTest: l => SP.residue.label_seq_id(l) < 7
        // });
        // structureEntity2.value = Selection.unionStructure(await Query(q1)(structureEntity2.value).run());
        // await StructureToBackbone.apply(this.ctx, structureEntity2, { ...backboneProps, visible: true })
        // await StructureToCartoon.apply(this.ctx, structureEntity2, { ...cartoonProps, visible: true })
        // await StructureToBallAndStick.apply(this.ctx, structureEntity2, { ...ballAndStickProps, visible: false })
        // StructureCenter.apply(this.ctx, structureEntity2)
    }

    loadPdbid (pdbid: string) {
        // return this.loadMmcifUrl(`http://www.ebi.ac.uk/pdbe/static/entry/${pdbid}_updated.cif`)
        return this.loadMmcifUrl(`https://files.rcsb.org/download/${pdbid}.cif`)
    }

    dispose () {
        // TODO
    }
}