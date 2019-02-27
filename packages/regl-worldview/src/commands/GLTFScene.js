// @flow

//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mat4 } from "gl-matrix";
import React from "react";

import type { Pose, Scale } from "../types";
import { blend, pointToVec3, orientationToVec4 } from "../utils/commandUtils";
import parseGLB from "../utils/parseGLB";
import WorldviewReactContext from "../WorldviewReactContext";
import Command from "./Command";

function glConstantToRegl(value: ?number): ?string {
  if (value === undefined) {
    return undefined;
  }
  // prettier-ignore
  switch (value) {
    // min/mag filters
    case WebGLRenderingContext.NEAREST: return "nearest";
    case WebGLRenderingContext.LINEAR: return "linear";
    case WebGLRenderingContext.NEAREST_MIPMAP_NEAREST: return "nearest mipmap nearest";
    case WebGLRenderingContext.NEAREST_MIPMAP_LINEAR: return "nearest mipmap linear";
    case WebGLRenderingContext.LINEAR_MIPMAP_NEAREST: return "linear mipmap nearest";
    case WebGLRenderingContext.LINEAR_MIPMAP_LINEAR: return "linear mipmap linear";
    // texture wrapping modes
    case WebGLRenderingContext.REPEAT: return "repeat";
    case WebGLRenderingContext.CLAMP_TO_EDGE: return "clamp";
    case WebGLRenderingContext.MIRRORED_REPEAT: return "mirror";
  }
  throw new Error(`unhandled constant value ${JSON.stringify(value)}`);
}

const drawModel = (regl) => {
  const command = regl({
    primitive: "triangles",
    blend,
    uniforms: {
      globalAlpha: regl.context("globalAlpha"),
      poseMatrix: regl.context("poseMatrix"),

      baseColorTexture: regl.prop("baseColorTexture"),
      baseColorFactor: regl.prop("baseColorFactor"),
      nodeMatrix: regl.prop("nodeMatrix"),
      "light.direction": [0, 0, -1],
      "light.ambientIntensity": 0.5,
      "light.diffuseIntensity": 0.5,
    },
    attributes: {
      position: regl.prop("positions"),
      normal: regl.prop("normals"),
      texCoord: regl.prop("texCoords"),
    },
    elements: regl.prop("indices"),
    vert: `
  uniform mat4 projection, view;
  uniform mat4 nodeMatrix;
  uniform mat4 poseMatrix;
  attribute vec3 position, normal;
  varying vec3 vNormal;
  attribute vec2 texCoord;
  varying vec2 vTexCoord;

  void main() {
    // using the projection matrix for normals breaks lighting for orthographic mode
    mat4 mv = view * poseMatrix * nodeMatrix;
    vNormal = normalize((mv * vec4(normal, 0)).xyz);
    vTexCoord = texCoord;
    gl_Position = projection * mv * vec4(position, 1);
  }
  `,
    frag: `
  precision mediump float;
  uniform float globalAlpha;
  uniform sampler2D baseColorTexture;
  uniform vec4 baseColorFactor;
  varying mediump vec2 vTexCoord;
  varying mediump vec3 vNormal;

  // Basic directional lighting from:
  // http://ogldev.atspace.co.uk/www/tutorial18/tutorial18.html
  struct DirectionalLight {
    mediump vec3 direction;
    lowp float ambientIntensity;
    lowp float diffuseIntensity;
  };
  uniform DirectionalLight light;

  void main() {
    vec4 baseColor = texture2D(baseColorTexture, vTexCoord) * baseColorFactor;
    float diffuse = light.diffuseIntensity * max(0.0, dot(vNormal, -light.direction));
    gl_FragColor = vec4((light.ambientIntensity + diffuse) * baseColor.rgb, baseColor.a * globalAlpha);
  }
  `,
  });

  // default values for when baseColorTexture is not specified
  const singleTexCoord = regl.buffer([0, 0]);
  const whiteTexture = regl.texture({
    data: [255, 255, 255, 255],
    width: 1,
    height: 1,
  });

  // Build the draw calls needed to draw the model. This only needs to happen once, since they
  // are the same each time, with only poseMatrix changing.
  let drawCalls;
  function prepareDrawCallsIfNeeded(model) {
    if (drawCalls) {
      return;
    }

    // upload textures to the GPU
    const textures =
      model.json.textures &&
      model.json.textures.map((textureInfo) => {
        const sampler = model.json.samplers[textureInfo.sampler];
        const bitmap: ImageBitmap = model.images[textureInfo.source];
        const texture = regl.texture({
          data: bitmap,
          min: glConstantToRegl(sampler.minFilter),
          mag: glConstantToRegl(sampler.magFilter),
          wrapS: glConstantToRegl(sampler.wrapS),
          wrapT: glConstantToRegl(sampler.wrapT),
        });
        return texture;
      });
    if (model.images) {
      model.images.forEach((bitmap: ImageBitmap) => bitmap.close());
    }
    drawCalls = [];

    // helper to draw the primitives comprising a mesh
    function drawMesh(mesh, nodeMatrix) {
      for (const primitive of mesh.primitives) {
        const material = model.json.materials[primitive.material];
        const texInfo = material.pbrMetallicRoughness.baseColorTexture;
        drawCalls.push({
          indices: model.accessors[primitive.indices],
          positions: model.accessors[primitive.attributes.POSITION],
          normals: model.accessors[primitive.attributes.NORMAL],
          texCoords: texInfo
            ? model.accessors[primitive.attributes[`TEXCOORD_${texInfo.texCoord || 0}`]]
            : { divisor: 1, buffer: singleTexCoord },
          baseColorTexture: texInfo ? textures[texInfo.index] : whiteTexture,
          baseColorFactor: material.pbrMetallicRoughness.baseColorFactor || [1, 1, 1, 1],
          nodeMatrix,
        });
      }
    }

    // helper to draw all the meshes contained in a node and its child nodes
    function drawNode(node, parentMatrix) {
      const nodeMatrix = node.matrix
        ? mat4.clone(node.matrix)
        : mat4.fromRotationTranslationScale(
            mat4.create(),
            node.rotation || [0, 0, 0, 1],
            node.translation || [0, 0, 0],
            node.scale || [1, 1, 1]
          );
      mat4.mul(nodeMatrix, parentMatrix, nodeMatrix);
      if (node.mesh != null) {
        drawMesh(model.json.meshes[node.mesh], nodeMatrix);
      }
      if (node.children) {
        for (const childIdx of node.children) {
          drawNode(model.json.nodes[childIdx], nodeMatrix);
        }
      }
    }

    // finally, draw each of the main scene's nodes
    for (const nodeIdx of model.json.scenes[model.json.scene].nodes) {
      const rootTransform = mat4.create();
      mat4.rotateX(rootTransform, rootTransform, Math.PI / 2);
      mat4.rotateY(rootTransform, rootTransform, Math.PI / 2);
      drawNode(model.json.nodes[nodeIdx], rootTransform);
    }
  }

  // create a regl command to set the context for each draw call
  const withContext = regl({
    context: {
      poseMatrix: (context, props) =>
        mat4.fromRotationTranslationScale(
          mat4.create(),
          orientationToVec4(props.pose.orientation),
          pointToVec3(props.pose.position),
          props.scale ? pointToVec3(props.scale) : [1, 1, 1]
        ),
      globalAlpha: (context, props) => (props.alpha == null ? 1 : props.alpha),
    },
  });

  return (props) => {
    prepareDrawCallsIfNeeded(props.model);
    withContext(props, () => {
      command(drawCalls);
    });
  };
};

type Props = {|
  model: string | (() => Promise<Object>),
  children: {|
    pose: Pose,
    scale: Scale,
    alpha: ?number,
  |},
|};

export default class GLTFScene extends React.Component<Props, {| loadedModel: ?Object |}> {
  state = {
    loadedModel: undefined,
  };
  _context = undefined;

  async _loadModel(): Promise<Object> {
    const { model } = this.props;
    if (typeof model === "function") {
      return model();
    } else if (typeof model === "string") {
      const response = await fetch(model);
      if (!response.ok) {
        throw new Error(`failed to fetch GLB: ${response.status}`);
      }
      return parseGLB(await response.arrayBuffer());
    }
    /*:: (model: empty) */
    throw new Error(`unsupported model prop: ${typeof model}`);
  }

  componentDidMount() {
    this._loadModel()
      .then((loadedModel) => {
        this.setState({ loadedModel });
        if (this._context) {
          this._context.onDirty();
        }
      })
      .catch((err) => {
        console.error("error loading GLB model:", err);
      });
  }

  render() {
    const { loadedModel } = this.state;
    if (!loadedModel) {
      return null;
    }
    return (
      <WorldviewReactContext.Consumer>
        {(context) => {
          this._context = context;
          return <Command reglCommand={drawModel} drawProps={{ model: loadedModel, ...this.props.children }} />;
        }}
      </WorldviewReactContext.Consumer>
    );
  }
}
