// @flow

//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mat4 } from "gl-matrix";
import React from "react";

import loadGLB from "../utils/loadGLB";

import { Command, pointToVec3, orientationToVec4, type Pose, type Point, WorldviewReactContext } from "..";

function glConstantToRegl(value: ?number): ?string {
  if (value === undefined) {
    return undefined;
  }
  // prettier-ignore
  switch (value) {
    // min/mag filters
    case WebGLRenderingContext.NEAREST: return 'nearest';
    case WebGLRenderingContext.LINEAR: return 'linear';
    case WebGLRenderingContext.NEAREST_MIPMAP_NEAREST: return 'nearest mipmap nearest';
    case WebGLRenderingContext.NEAREST_MIPMAP_LINEAR: return 'nearest mipmap linear';
    case WebGLRenderingContext.LINEAR_MIPMAP_NEAREST: return 'linear mipmap nearest';
    case WebGLRenderingContext.LINEAR_MIPMAP_LINEAR: return 'linear mipmap linear';
    // texture wrapping modes
    case WebGLRenderingContext.REPEAT: return 'repeat';
    case WebGLRenderingContext.CLAMP_TO_EDGE: return 'clamp';
    case WebGLRenderingContext.MIRRORED_REPEAT: return 'mirror';
  }
  throw new Error(`unhandled constant value ${JSON.stringify(value)}`);
}

const drawModel = (regl) => {
  const command = regl({
    primitive: "triangles",
    uniforms: {
      baseColorTexture: regl.prop("baseColorTexture"),
      nodeMatrix: regl.prop("nodeMatrix"),
      poseMatrix: regl.context("poseMatrix"),
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
  uniform sampler2D baseColorTexture;
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
    vec3 baseColor = texture2D(baseColorTexture, vTexCoord).rgb;
    float diffuse = light.diffuseIntensity * max(0.0, dot(vNormal, -light.direction));
    gl_FragColor = vec4((light.ambientIntensity + diffuse) * baseColor, 1);
  }
  `,
  });

  let drawCalls;
  function prepareDrawCallsIfNeeded(model) {
    if (drawCalls) {
      return;
    }

    const textures = model.json.textures.map((texture) => {
      const sampler = model.json.samplers[texture.sampler];
      return regl.texture({
        data: model.images[texture.source],
        min: "linear", //glConstantToRegl(sampler.minFilter),
        mag: glConstantToRegl(sampler.magFilter),
        wrapS: glConstantToRegl(sampler.wrapS),
        wrapT: glConstantToRegl(sampler.wrapT),
      });
    });
    drawCalls = [];

    function drawMesh(mesh, nodeMatrix) {
      for (const primitive of mesh.primitives) {
        const material = model.json.materials[primitive.material];
        const texInfo = material.pbrMetallicRoughness.baseColorTexture;
        drawCalls.push({
          indices: model.accessors[primitive.indices],
          positions: model.accessors[primitive.attributes.POSITION],
          normals: model.accessors[primitive.attributes.NORMAL],
          texCoords: model.accessors[primitive.attributes[`TEXCOORD_${texInfo.texCoord || 0}`]],
          baseColorTexture: textures[texInfo.index],
          nodeMatrix,
        });
      }
    }
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
    for (const nodeIdx of model.json.scenes[model.json.scene].nodes) {
      const rootTransform = mat4.create();
      mat4.rotateX(rootTransform, rootTransform, Math.PI / 2);
      mat4.rotateY(rootTransform, rootTransform, Math.PI / 2);
      drawNode(model.json.nodes[nodeIdx], rootTransform);
    }
  }

  const withPoseMatrix = regl({
    context: {
      poseMatrix: (context, props) =>
        mat4.fromRotationTranslationScale(
          mat4.create(),
          orientationToVec4(props.pose.orientation),
          pointToVec3(props.pose.position),
          props.scale ? pointToVec3(props.scale) : [1, 1, 1]
        ),
    },
  });

  return (props) => {
    prepareDrawCallsIfNeeded(props.model);
    withPoseMatrix(props, () => {
      command(drawCalls);
    });
  };
};

type Props = {|
  modelURL: string,
  children: {|
    pose: Pose,
    scale: Point,
  |},
|};

export default class GLTFScene extends React.Component<Props, *> {
  state = {
    model: undefined,
  };
  _context = undefined;

  componentDidMount() {
    loadGLB(this.props.modelURL).then((model) => {
      this.setState({ model });
      if (this._context) {
        this._context.onDirty();
      }
    });
  }

  render() {
    const { model } = this.state;
    if (!model) {
      return null;
    }
    return (
      <WorldviewReactContext.Consumer>
        {(context) => {
          this._context = context;
          return <Command reglCommand={drawModel} drawProps={{ model, ...this.props.children }} />;
        }}
      </WorldviewReactContext.Consumer>
    );
  }
}
