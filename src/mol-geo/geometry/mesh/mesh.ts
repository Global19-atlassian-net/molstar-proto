/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { Task, RuntimeContext } from 'mol-task'
import { ValueCell } from 'mol-util'
import { Vec3, Mat4 } from 'mol-math/linear-algebra'
import { Sphere3D } from 'mol-math/geometry'
import { transformPositionArray/* , transformDirectionArray, getNormalMatrix */ } from '../../util';
import { MeshValues } from 'mol-gl/renderable';
import { Geometry } from '../geometry';
import { createMarkers } from '../marker-data';
import { TransformData } from '../transform-data';
import { LocationIterator } from '../../util/location-iterator';
import { createColors } from '../color-data';
import { ChunkedArray } from 'mol-data/util';

export interface Mesh {
    readonly kind: 'mesh',

    /** Number of vertices in the mesh */
    vertexCount: number,
    /** Number of triangles in the mesh */
    triangleCount: number,

    /** Vertex buffer as array of xyz values wrapped in a value cell */
    readonly vertexBuffer: ValueCell<Float32Array>,
    /** Index buffer as array of vertex index triplets wrapped in a value cell */
    readonly indexBuffer: ValueCell<Uint32Array>,
    /** Normal buffer as array of xyz values for each vertex wrapped in a value cell */
    readonly normalBuffer: ValueCell<Float32Array>,
    /** Group buffer as array of group ids for each vertex wrapped in a value cell */
    readonly groupBuffer: ValueCell<Float32Array>,

    /** Flag indicating if normals are computed for the current set of vertices */
    normalsComputed: boolean,

    /** Bounding sphere of the mesh */
    boundingSphere?: Sphere3D
}

export namespace Mesh {
    export function createEmpty(mesh?: Mesh): Mesh {
        const vb = mesh ? mesh.vertexBuffer.ref.value : new Float32Array(0)
        const ib = mesh ? mesh.indexBuffer.ref.value : new Uint32Array(0)
        const nb = mesh ? mesh.normalBuffer.ref.value : new Float32Array(0)
        const gb = mesh ? mesh.groupBuffer.ref.value : new Float32Array(0)
        return {
            kind: 'mesh',
            vertexCount: 0,
            triangleCount: 0,
            vertexBuffer: mesh ? ValueCell.update(mesh.vertexBuffer, vb) : ValueCell.create(vb),
            indexBuffer: mesh ? ValueCell.update(mesh.indexBuffer, ib) : ValueCell.create(ib),
            normalBuffer: mesh ? ValueCell.update(mesh.normalBuffer, nb) : ValueCell.create(nb),
            groupBuffer: mesh ? ValueCell.update(mesh.groupBuffer, gb) : ValueCell.create(gb),
            normalsComputed: true,
        }
    }

    export function computeNormalsImmediate(mesh: Mesh) {
        if (mesh.normalsComputed) return;

        const normals = mesh.normalBuffer.ref.value.length >= mesh.vertexCount * 3
            ? mesh.normalBuffer.ref.value : new Float32Array(mesh.vertexBuffer.ref.value.length);

        const v = mesh.vertexBuffer.ref.value, triangles = mesh.indexBuffer.ref.value;

        if (normals === mesh.normalBuffer.ref.value) {
            for (let i = 0, ii = 3 * mesh.vertexCount; i < ii; i += 3) {
                normals[i] = 0; normals[i + 1] = 0; normals[i + 2] = 0;
            }
        }

        const x = Vec3.zero(), y = Vec3.zero(), z = Vec3.zero(), d1 = Vec3.zero(), d2 = Vec3.zero(), n = Vec3.zero();
        for (let i = 0, ii = 3 * mesh.triangleCount; i < ii; i += 3) {
            const a = 3 * triangles[i], b = 3 * triangles[i + 1], c = 3 * triangles[i + 2];

            Vec3.fromArray(x, v, a);
            Vec3.fromArray(y, v, b);
            Vec3.fromArray(z, v, c);
            Vec3.sub(d1, z, y);
            Vec3.sub(d2, x, y);
            Vec3.cross(n, d1, d2);

            normals[a] += n[0]; normals[a + 1] += n[1]; normals[a + 2] += n[2];
            normals[b] += n[0]; normals[b + 1] += n[1]; normals[b + 2] += n[2];
            normals[c] += n[0]; normals[c + 1] += n[1]; normals[c + 2] += n[2];
        }

        for (let i = 0, ii = 3 * mesh.vertexCount; i < ii; i += 3) {
            const nx = normals[i];
            const ny = normals[i + 1];
            const nz = normals[i + 2];
            const f = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
            normals[i] *= f; normals[i + 1] *= f; normals[i + 2] *= f;

            // console.log([normals[i], normals[i + 1], normals[i + 2]], [v[i], v[i + 1], v[i + 2]])
        }
        ValueCell.update(mesh.normalBuffer, normals);
        mesh.normalsComputed = true;
    }

    export function computeNormals(surface: Mesh): Task<Mesh> {
        return Task.create<Mesh>('Surface (Compute Normals)', async ctx => {
            if (surface.normalsComputed) return surface;

            await ctx.update('Computing normals...');
            computeNormalsImmediate(surface);
            return surface;
        });
    }

    export function transformImmediate(mesh: Mesh, t: Mat4) {
        transformRangeImmediate(mesh, t, 0, mesh.vertexCount)
    }

    export function transformRangeImmediate(mesh: Mesh, t: Mat4, offset: number, count: number) {
        const v = mesh.vertexBuffer.ref.value
        transformPositionArray(t, v, offset, count)
        // TODO normals transformation does not work for an unknown reason, ASR
        // if (mesh.normalBuffer.ref.value) {
        //     const n = getNormalMatrix(Mat3.zero(), t)
        //     transformDirectionArray(n, mesh.normalBuffer.ref.value, offset, count)
        //     mesh.normalsComputed = true;
        // }
        ValueCell.update(mesh.vertexBuffer, v);
        mesh.normalsComputed = false;
    }

    export function computeBoundingSphere(mesh: Mesh): Task<Mesh> {
        return Task.create<Mesh>('Mesh (Compute Bounding Sphere)', async ctx => {
            if (mesh.boundingSphere) {
                return mesh;
            }
            await ctx.update('Computing bounding sphere...');

            const vertices = mesh.vertexBuffer.ref.value;
            let x = 0, y = 0, z = 0;
            for (let i = 0, _c = vertices.length; i < _c; i += 3) {
                x += vertices[i];
                y += vertices[i + 1];
                z += vertices[i + 2];
            }
            x /= mesh.vertexCount;
            y /= mesh.vertexCount;
            z /= mesh.vertexCount;
            let r = 0;
            for (let i = 0, _c = vertices.length; i < _c; i += 3) {
                const dx = x - vertices[i];
                const dy = y - vertices[i + 1];
                const dz = z - vertices[i + 2];
                r = Math.max(r, dx * dx + dy * dy + dz * dz);
            }
            mesh.boundingSphere = {
                center: Vec3.create(x, y, z),
                radius: Math.sqrt(r)
            }
            return mesh;
        });
    }

    /**
     * Ensure that each vertices of each triangle have the same group id.
     * Note that normals are copied over and can't be re-created from the new mesh.
     */
    export function uniformTriangleGroup(mesh: Mesh) {
        const { indexBuffer, vertexBuffer, groupBuffer, normalBuffer, triangleCount, vertexCount } = mesh
        const ib = indexBuffer.ref.value
        const vb = vertexBuffer.ref.value
        const gb = groupBuffer.ref.value
        const nb = normalBuffer.ref.value

        // new
        const index = ChunkedArray.create(Uint32Array, 3, 1024, triangleCount)

        // re-use
        const vertex = ChunkedArray.create(Float32Array, 3, 1024, vb)
        vertex.currentIndex = vertexCount * 3
        vertex.elementCount = vertexCount
        const normal = ChunkedArray.create(Float32Array, 3, 1024, nb)
        normal.currentIndex = vertexCount * 3
        normal.elementCount = vertexCount
        const group = ChunkedArray.create(Float32Array, 1, 1024, gb)
        group.currentIndex = vertexCount
        group.elementCount = vertexCount

        const v = Vec3.zero()
        const n = Vec3.zero()

        function add(i: number) {
            Vec3.fromArray(v, vb, i * 3)
            Vec3.fromArray(n, nb, i * 3)
            ChunkedArray.add3(vertex, v[0], v[1], v[2])
            ChunkedArray.add3(normal, n[0], n[1], n[2])
        }

        let newVertexCount = vertexCount
        for (let i = 0, il = triangleCount; i < il; ++i) {
            const v0 = ib[i * 3], v1 = ib[i * 3 + 1], v2 = ib[i * 3 + 2]
            const g0 = gb[v0], g1 = gb[v1], g2 = gb[v2]
            if (g0 !== g1 || g0 !== g2) {
                add(v0); add(v1); add(v2)
                ChunkedArray.add3(index, newVertexCount, newVertexCount + 1, newVertexCount + 2)
                const g = g1 === g2 ? g1 : g0
                for (let j = 0; j < 3; ++j) ChunkedArray.add(group, g)
                newVertexCount += 3
            } else {
                ChunkedArray.add3(index, v0, v1, v2)
            }
        }

        const newIb = ChunkedArray.compact(index)
        const newVb = ChunkedArray.compact(vertex)
        const newNb = ChunkedArray.compact(normal)
        const newGb = ChunkedArray.compact(group)

        mesh.vertexCount = newVertexCount

        ValueCell.update(vertexBuffer, newVb) as ValueCell<Float32Array>
        ValueCell.update(groupBuffer, newGb) as ValueCell<Float32Array>
        ValueCell.update(indexBuffer, newIb) as ValueCell<Uint32Array>
        ValueCell.update(normalBuffer, newNb) as ValueCell<Float32Array>

        return mesh
    }

    //

    export const DefaultProps = {
        ...Geometry.DefaultProps,
        doubleSided: false,
        flipSided: false,
        flatShaded: false,
    }
    export type Props = typeof DefaultProps

    export async function createValues(ctx: RuntimeContext, mesh: Mesh, transform: TransformData, locationIt: LocationIterator, props: Props): Promise<MeshValues> {
        const { instanceCount, groupCount } = locationIt
        const color = await createColors(ctx, locationIt, props.colorTheme)
        const marker = createMarkers(instanceCount * groupCount)

        const counts = { drawCount: mesh.triangleCount * 3, groupCount, instanceCount }

        return {
            aPosition: mesh.vertexBuffer,
            aNormal: mesh.normalBuffer,
            aGroup: mesh.groupBuffer,
            elements: mesh.indexBuffer,
            ...color,
            ...marker,
            ...transform,

            ...Geometry.createValues(props, counts),
            dDoubleSided: ValueCell.create(props.doubleSided),
            dFlatShaded: ValueCell.create(props.flatShaded),
            dFlipSided: ValueCell.create(props.flipSided),
        }
    }

    export function updateValues(values: MeshValues, props: Props) {
        Geometry.updateValues(values, props)
        ValueCell.updateIfChanged(values.dDoubleSided, props.doubleSided)
        ValueCell.updateIfChanged(values.dFlatShaded, props.flatShaded)
        ValueCell.updateIfChanged(values.dFlipSided, props.flipSided)
    }
}

//     function addVertex(src: Float32Array, i: number, dst: Float32Array, j: number) {
//         dst[3 * j] += src[3 * i];
//         dst[3 * j + 1] += src[3 * i + 1];
//         dst[3 * j + 2] += src[3 * i + 2];
//     }

//     function laplacianSmoothIter(surface: Surface, vertexCounts: Int32Array, vs: Float32Array, vertexWeight: number) {
//         const triCount = surface.triangleIndices.length,
//             src = surface.vertices;

//         const triangleIndices = surface.triangleIndices;

//         for (let i = 0; i < triCount; i += 3) {
//             const a = triangleIndices[i],
//                 b = triangleIndices[i + 1],
//                 c = triangleIndices[i + 2];

//             addVertex(src, b, vs, a);
//             addVertex(src, c, vs, a);

//             addVertex(src, a, vs, b);
//             addVertex(src, c, vs, b);

//             addVertex(src, a, vs, c);
//             addVertex(src, b, vs, c);
//         }

//         const vw = 2 * vertexWeight;
//         for (let i = 0, _b = surface.vertexCount; i < _b; i++) {
//             const n = vertexCounts[i] + vw;
//             vs[3 * i] = (vs[3 * i] + vw * src[3 * i]) / n;
//             vs[3 * i + 1] = (vs[3 * i + 1] + vw * src[3 * i + 1]) / n;
//             vs[3 * i + 2] = (vs[3 * i + 2] + vw * src[3 * i + 2]) / n;
//         }
//     }

//     async function laplacianSmoothComputation(ctx: Computation.Context, surface: Surface, iterCount: number, vertexWeight: number) {
//         await ctx.updateProgress('Smoothing surface...', true);

//         const vertexCounts = new Int32Array(surface.vertexCount),
//             triCount = surface.triangleIndices.length;

//         const tris = surface.triangleIndices;
//         for (let i = 0; i < triCount; i++) {
//             // in a triangle 2 edges touch each vertex, hence the constant.
//             vertexCounts[tris[i]] += 2;
//         }

//         let vs = new Float32Array(surface.vertices.length);
//         let started = Utils.PerformanceMonitor.currentTime();
//         await ctx.updateProgress('Smoothing surface...', true);
//         for (let i = 0; i < iterCount; i++) {
//             if (i > 0) {
//                 for (let j = 0, _b = vs.length; j < _b; j++) vs[j] = 0;
//             }
//             surface.normals = void 0;
//             laplacianSmoothIter(surface, vertexCounts, vs, vertexWeight);
//             const t = surface.vertices;
//             surface.vertices = <any>vs;
//             vs = <any>t;

//             const time = Utils.PerformanceMonitor.currentTime();
//             if (time - started > Computation.UpdateProgressDelta) {
//                 started = time;
//                 await ctx.updateProgress('Smoothing surface...', true, i + 1, iterCount);
//             }
//         }
//         return surface;
//     }

//     /*
//      * Smooths the vertices by averaging the neighborhood.
//      *
//      * Resets normals. Might replace vertex array.
//      */
//     export function laplacianSmooth(surface: Surface, iterCount: number = 1, vertexWeight: number = 1): Computation<Surface> {

//         if (iterCount < 1) iterCount = 0;
//         if (iterCount === 0) return Computation.resolve(surface);

//         return computation(async ctx => await laplacianSmoothComputation(ctx, surface, iterCount, (1.1 * vertexWeight) / 1.1));
//     }