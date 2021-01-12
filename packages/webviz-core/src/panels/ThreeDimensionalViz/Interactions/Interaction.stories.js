// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import styled from "styled-components";

import Interactions, { OBJECT_TAB_TYPE, LINKED_VARIABLES_TAB_TYPE } from "./index";
import useLinkedGlobalVariables from "./useLinkedGlobalVariables";
import delay from "webviz-core/shared/delay";
import tick from "webviz-core/shared/tick";
import Flex from "webviz-core/src/components/Flex";
import MockPanelContextProvider from "webviz-core/src/components/MockPanelContextProvider";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import { decodeMarker } from "webviz-core/src/panels/ThreeDimensionalViz/commands/PointClouds/decodeMarker";
import {
  POINT_CLOUD_MESSAGE,
  POINT_CLOUD_WITH_ADDITIONAL_FIELDS,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands/PointClouds/fixture/pointCloudData";
import { MarkerStory } from "webviz-core/src/panels/ThreeDimensionalViz/stories/MarkerStory";
import PanelSetup, { triggerInputChange } from "webviz-core/src/stories/PanelSetup";
import { ScreenshotSizedContainer } from "webviz-core/src/stories/storyHelpers";
import colors from "webviz-core/src/styles/colors.module.scss";
import { simulateDragClick } from "webviz-core/src/test/mouseEventsHelper";

const SWrapper = styled.div`
  background: #2d2c33;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;
const SP = styled.p`
  color: ${colors.textMuted};
`;

const markerObject = {
  id: "12345",
  header: { frame_id: "some_frame", stamp: { sec: 0, nsec: 0 } },
  action: 0,
  ns: "",
  type: 0,
  scale: {
    x: 2,
    y: 2,
    z: 4,
  },
  color: {
    r: 1,
    g: 0.1,
    b: 0,
    a: 0.7,
  },
  pose: {
    position: {
      x: -1,
      y: 1,
      z: -5,
    },
    orientation: {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    },
  },
};

const interactiveMarkerObject = {
  ...markerObject,
  interactionData: { topic: "/foo/bar", originalMessage: markerObject },
};
const selectedObject = { object: interactiveMarkerObject, instanceIndex: null };

const sharedProps = {
  selectedObject,
  interactionsTabType: OBJECT_TAB_TYPE,
  setInteractionsTabType: () => {},
};

function GlobalVariablesDisplay() {
  const { globalVariables } = useGlobalVariables();
  return (
    <SP>
      <strong>Global variables: </strong>
      {JSON.stringify(globalVariables)}
    </SP>
  );
}
function LinkedGlobalVariablesDisplay() {
  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  return (
    <SP>
      <strong>Global variable links: </strong>
      {JSON.stringify(linkedGlobalVariables)}
    </SP>
  );
}

function PanelSetupWithData({
  children,
  showGlobalVariables,
  showLinkedGlobalVariables,
  title,
  onMount,
  disableAutoOpenClickedObject = true,
}: {
  children: React.Node,
  showGlobalVariables?: boolean,
  showLinkedGlobalVariables?: boolean,
  title: React.Node,
  onMount?: (el: HTMLDivElement) => void,
  disableAutoOpenClickedObject?: boolean,
}) {
  return (
    <PanelSetup
      omitDragAndDrop
      style={{ width: "auto", height: "auto", display: "inline-flex" }}
      fixture={{
        topics: [],
        datatypes: {},
        frame: {},
        linkedGlobalVariables: [
          {
            topic: "/foo/bar",
            markerKeyPath: ["frame_id", "header"],
            name: "some_val",
          },
          {
            topic: "/foo/bar",
            markerKeyPath: ["type"],
            name: "type",
          },
          {
            topic: "/foo/bar",
            markerKeyPath: ["action"],
            name: "some_val",
          },
          {
            topic: "/some_topic",
            markerKeyPath: ["scale"],
            name: "scale",
          },
          {
            topic: "/other_topic",
            markerKeyPath: ["scale"],
            name: "scale",
          },
          {
            topic: "/foo/bar",
            markerKeyPath: ["y", "some_very_very_long_path"],
            name: "scaleY",
          },
        ],
        globalVariables: {
          id: 100,
          scaleY: 2.4,
          fooScaleX: 3,
        },
      }}>
      <MockPanelContextProvider config={{ disableAutoOpenClickedObject }}>
        <div
          style={{ margin: 16 }}
          ref={(el) => {
            if (el && onMount) {
              onMount(el);
            }
          }}>
          <p>{title}</p>
          <Flex>
            <Flex col style={{ flex: 1 }}>
              {showGlobalVariables && <GlobalVariablesDisplay />}
              {showLinkedGlobalVariables && <LinkedGlobalVariablesDisplay />}
            </Flex>
            {children}
          </Flex>
        </div>
      </MockPanelContextProvider>
    </PanelSetup>
  );
}

const storyParams = { screenshot: { viewport: { width: 1001, height: 1101 } } };

storiesOf("<Interaction>", module)
  .addParameters(storyParams)
  .add("default", () => {
    return (
      <SWrapper>
        <PanelSetupWithData title="Link Tab">
          <Interactions {...sharedProps} selectedObject={null} interactionsTabType={LINKED_VARIABLES_TAB_TYPE} />
        </PanelSetupWithData>
        <PanelSetupWithData title="Default without clicked object">
          <Interactions {...sharedProps} selectedObject={undefined} interactionsTabType={OBJECT_TAB_TYPE} />
        </PanelSetupWithData>
        <PanelSetupWithData title="With interactionData">
          <Interactions {...sharedProps} />
        </PanelSetupWithData>
        <PanelSetupWithData
          title="Clicked link button"
          onMount={(el) => {
            const btn = el.querySelector("[data-test='link-id']");
            if (btn) {
              btn.click();
            }
          }}>
          <Interactions
            {...sharedProps}
            selectedObject={{ ...selectedObject, interactionData: { topic: "/foo/bar" } }}
          />
        </PanelSetupWithData>
        <PanelSetupWithData
          title="Add link to existing linked global variable"
          onMount={(el) => {
            const btn = el.querySelector("[data-test='link-scale']");
            if (btn) {
              btn.click();
            }
          }}>
          <Interactions
            {...sharedProps}
            selectedObject={{ ...selectedObject, interactionData: { topic: "/foo/bar" } }}
          />
        </PanelSetupWithData>
      </SWrapper>
    );
  })
  .add("instanced interactionData", () => {
    return (
      <SWrapper>
        <PanelSetupWithData title="With instanced interactionData">
          <Interactions
            {...sharedProps}
            interactionsTabType={OBJECT_TAB_TYPE}
            selectedObject={{
              object: { metadataByIndex: [{ ...markerObject, interactionData: { topic: "/foo/bar" } }] },
              instanceIndex: 0,
            }}
          />
        </PanelSetupWithData>
      </SWrapper>
    );
  })
  .add("PointCloud", () => {
    const cloud1 = { ...selectedObject.object, ...decodeMarker(POINT_CLOUD_MESSAGE) };
    const cloud2 = { ...selectedObject.object, ...decodeMarker(POINT_CLOUD_WITH_ADDITIONAL_FIELDS) };

    return (
      <SWrapper>
        <PanelSetupWithData title="default with point color">
          <Interactions
            {...sharedProps}
            selectedObject={{
              instanceIndex: 0,
              object: {
                ...cloud1,
                type: 102,
                interactionData: { topic: "/foo/bar", originalMessage: selectedObject.object },
              },
            }}
          />
        </PanelSetupWithData>
        <PanelSetupWithData title="with additional fields">
          <Interactions
            {...sharedProps}
            selectedObject={{
              instanceIndex: 0,
              object: {
                ...cloud2,
                type: 102,
                interactionData: { topic: "/foo/bar", originalMessage: selectedObject.object },
              },
            }}
          />
        </PanelSetupWithData>
      </SWrapper>
    );
  })
  .add("link and multi-link global variables", () => {
    return (
      <SWrapper>
        <PanelSetupWithData showGlobalVariables showLinkedGlobalVariables title="Default">
          <Interactions {...sharedProps} />
        </PanelSetupWithData>

        <PanelSetupWithData
          showGlobalVariables
          showLinkedGlobalVariables
          title={
            <>
              Added a new link between <code>id</code> field and <code>$id</code> variable
            </>
          }
          style={{ margin: 8, display: "flex", overflow: "hidden" }}
          onMount={(el) => {
            const btn = el.querySelector("[data-test='link-id']");
            if (btn) {
              btn.click();
              setImmediate(() => {
                const linkFormBtn = document.querySelector("[data-test='link-form'] button");
                if (linkFormBtn) {
                  linkFormBtn.click();
                }
              });
            }
          }}>
          <Interactions {...sharedProps} />
        </PanelSetupWithData>
        <PanelSetupWithData
          showGlobalVariables
          showLinkedGlobalVariables
          title={
            <>
              Added another field <code>scale</code> to <code>$id</code> variable
            </>
          }
          style={{ margin: 8, display: "flex", overflow: "hidden" }}
          onMount={(el) => {
            // click the "link" icon button, manually change the input from "scale" to "id", then click "link" icon
            const btn = el.querySelector("[data-test='link-scale']");
            if (btn) {
              btn.click();
              setImmediate(() => {
                const linkNameInput = document.querySelector("[data-test='link-form'] input");
                if (linkNameInput) {
                  triggerInputChange(linkNameInput, "id");
                  const linkFormBtn = document.querySelector(
                    "[data-test='link-form'] [data-test='action-buttons'] button"
                  );
                  if (linkFormBtn) {
                    linkFormBtn.click();
                  }
                }
              });
            }
          }}>
          <Interactions {...sharedProps} />
        </PanelSetupWithData>
      </SWrapper>
    );
  })
  .add("unlink single linked global variable", () => {
    return (
      <SWrapper>
        <PanelSetupWithData
          title={
            <>
              Unlinked <code>type</code> field from <code>$type</code> variable
            </>
          }
          showGlobalVariables
          showLinkedGlobalVariables
          style={{ margin: 8, display: "flex", overflow: "hidden" }}
          onMount={(el) => {
            const btn = el.querySelector("[data-test='unlink-type']");
            if (btn) {
              btn.click();
              setImmediate(() => {
                const unlinkBtn = document.querySelector("[data-test='unlink-form'] button");
                if (unlinkBtn) {
                  unlinkBtn.click();
                }
              });
            }
          }}>
          <Interactions {...sharedProps} />
        </PanelSetupWithData>
      </SWrapper>
    );
  })
  .add("unlink multi-linked global variable", () => {
    return (
      <SWrapper>
        <PanelSetupWithData
          title={
            <>
              Unlinked <code>header.frame_id</code> field from <code>$some_val</code> variable{" "}
            </>
          }
          showGlobalVariables
          showLinkedGlobalVariables
          style={{ margin: 8, display: "flex", overflow: "hidden" }}
          onMount={(el) => {
            const btn = el.querySelector("[data-test='unlink-some_val']");
            if (btn) {
              btn.click();
              setImmediate(() => {
                const unlinkBtn = document.querySelector("[data-test='unlink-form'] button");
                if (unlinkBtn) {
                  unlinkBtn.click();
                }
              });
            }
          }}>
          <Interactions {...sharedProps} />
        </PanelSetupWithData>
      </SWrapper>
    );
  });

const selectObject = () => simulateDragClick([468, 340]);
const deselectObject = () => simulateDragClick([515, 630]);

storiesOf("<Interaction> / open-close behavior", module)
  .addParameters({ screenshot: { delay: 2500, ...storyParams.screenshot } })
  .add("auto opens the object details after selectedObject is set", () => {
    return (
      <ScreenshotSizedContainer>
        <MarkerStory
          onMount={(_) =>
            setImmediate(async () => {
              await delay(250);
              selectObject();
            })
          }
        />
      </ScreenshotSizedContainer>
    );
  })
  .add("does not auto open the object details during drawing when it's closed", () => {
    return (
      <ScreenshotSizedContainer>
        <MarkerStory
          onMount={(_) =>
            setImmediate(async () => {
              document.querySelectorAll('[data-test="ExpandingToolbar-Drawing tools"]')[0].click(); // Start drawing
              await delay(250);
              selectObject();
            })
          }
        />
      </ScreenshotSizedContainer>
    );
  })
  .add("auto closes the object details when selectedObject becomes null", () => {
    return (
      <ScreenshotSizedContainer>
        <MarkerStory
          onMount={(_) =>
            setImmediate(async () => {
              await delay(250);
              selectObject();
              await tick();
              deselectObject();
            })
          }
        />
      </ScreenshotSizedContainer>
    );
  })
  .add("does not open after selectedObject is set if disableAutoOpenClickedObject enabled", () => {
    return (
      <ScreenshotSizedContainer>
        <MarkerStory
          initialConfigOverride={{ disableAutoOpenClickedObject: true }}
          onMount={(_) =>
            setImmediate(async () => {
              selectObject();
            })
          }
        />
      </ScreenshotSizedContainer>
    );
  });
