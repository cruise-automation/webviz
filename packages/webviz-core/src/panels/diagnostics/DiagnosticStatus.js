// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChartLineVariantIcon from "@mdi/svg/svg/chart-line-variant.svg";
import DotsHorizontalIcon from "@mdi/svg/svg/dots-horizontal.svg";
import cx from "classnames";
import { clamp } from "lodash";
import * as React from "react";
import { createSelector } from "reselect";
import sanitizeHtml from "sanitize-html";
import styled from "styled-components";

import style from "./DiagnosticStatus.module.scss";
import { LEVEL_NAMES, type DiagnosticInfo, type KeyValue, type DiagnosticStatusMessage } from "./util";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";
import { openSiblingPlotPanel } from "webviz-core/src/panels/Plot";
import { openSiblingStateTransitionsPanel } from "webviz-core/src/panels/StateTransitions";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { PanelConfig } from "webviz-core/src/types/panels";

const MIN_SPLIT_FRACTION = 0.1;

type Props = {|
  info: DiagnosticInfo,
  splitFraction: number,
  onChangeSplitFraction: ?(number) => void,
  topicToRender: string,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
|};

const ResizeHandle = styled.div.attrs(({ splitFraction }) => ({
  style: { left: `${100 * splitFraction}%` },
}))`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  margin-left: -6px;
  cursor: col-resize;
  :hover,
  :active,
  :focus {
    outline: none;
    ::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 6px;
      margin-left: -2px;
      width: 4px;
      background-color: ${colors.divider};
    }
  }
`;

const KeyValueTable = styled.table`
  table-layout: fixed;
  width: 100%;
  line-height: 1.3em;
  white-space: pre-line;
  overflow-wrap: break-word;
  text-align: left;
  tr:nth-child(odd) {
    background-color: #222;
  }
  td {
    border: none;
    padding: 1px 3px;
  }
  /* nested table styles */
  table {
    th {
      font-weight: bold;
    }
  }
`;

type FormattedKeyValue = {|
  key: string,
  keyHtml: ?{ __html: string },
  value: string,
  valueHtml: ?{ __html: string },
|};

const allowedTags = [
  // this comment forces the array onto multiple lines :)
  "b",
  "br",
  "center",
  "code",
  "em",
  "font",
  "i",
  "strong",
  "table",
  "td",
  "th",
  "tr",
  "tt",
  "u",
];

function sanitize(value: string): { __html: string } {
  return {
    __html: sanitizeHtml(value, {
      allowedTags,
      allowedAttributes: {
        font: ["color", "size"],
        td: ["colspan"],
        th: ["colspan"],
      },
    }),
  };
}

// preliminary check to avoid expensive operations when there is no html
const HAS_ANY_HTML = new RegExp(`<(${allowedTags.join("|")})`);

const getFormattedKeyValues = createSelector(
  (message: DiagnosticStatusMessage) => message,
  (message: DiagnosticStatusMessage): FormattedKeyValue[] => {
    return (message.values || []).map((kv: KeyValue) => {
      return {
        key: kv.key,
        keyHtml: HAS_ANY_HTML.test(kv.key) ? sanitize(kv.key) : undefined,
        value: kv.value,
        valueHtml: HAS_ANY_HTML.test(kv.value) ? sanitize(kv.value) : undefined,
      };
    });
  }
);

// component to display a single diagnostic status
class DiagnosticStatus extends React.Component<Props, *> {
  state = {
    collapsedSections: (new Set(): Set<string>),
  };

  _tableRef = React.createRef<HTMLTableElement>();

  static defaultProps = {
    splitFraction: 0.5,
  };

  onClickSection(name: string) {
    const collapsedSections = new Set(this.state.collapsedSections);
    if (collapsedSections.has(name)) {
      collapsedSections.delete(name);
    } else {
      collapsedSections.add(name);
    }
    this.setState({ collapsedSections });
  }

  _resizeMouseDown = (event: SyntheticMouseEvent<Element>) => {
    event.preventDefault();
    window.addEventListener("mousemove", this._resizeMouseMove);
    window.addEventListener("mouseup", this._resizeMouseUp);
  };

  _resizeMouseUp = () => {
    window.removeEventListener("mousemove", this._resizeMouseMove);
  };

  _resizeMouseMove = (event: SyntheticMouseEvent<Element>) => {
    const {
      _tableRef,
      props: { onChangeSplitFraction },
    } = this;

    if (!_tableRef.current || !onChangeSplitFraction) {
      return;
    }

    const { left, right } = _tableRef.current.getBoundingClientRect();
    const splitFraction = clamp((event.clientX - left) / (right - left), MIN_SPLIT_FRACTION, 1 - MIN_SPLIT_FRACTION);
    onChangeSplitFraction(splitFraction);
  };

  componentWillUnmount() {
    window.removeEventListener("mousemove", this._resizeMouseMove);
    window.removeEventListener("mouseup", this._resizeMouseUp);
  }

  _renderKeyValueCell(cls: string, html: ?{ __html: string }, str: string, openPlotPanelIconElem?: React.Node) {
    if (html) {
      return <td className={style.valueCell} dangerouslySetInnerHTML={html} />;
    }
    return (
      <td className={style.valueCell}>
        {str || "\xa0"}
        {openPlotPanelIconElem}
      </td>
    );
  }

  _renderKeyValueSections = (values: FormattedKeyValue[]): React.Node => {
    const { info, topicToRender, openSiblingPanel } = this.props;
    let inCollapsedSection = false;
    let ellipsisShown = false;
    return values.map((kv, idx) => {
      const keyIsSection = !kv.value && (kv.key.startsWith("==") || kv.key.startsWith("--"));
      const valIsSection = !kv.key && (kv.value.startsWith("==") || kv.value.startsWith("--"));
      if (keyIsSection || valIsSection) {
        const name = kv.key + kv.value;
        inCollapsedSection = this.state.collapsedSections.has(name);
        ellipsisShown = false;
        return (
          <tr key={idx} className={style.section} onClick={() => this.onClickSection(name)}>
            <th colSpan={2}>{name}</th>
          </tr>
        );
      } else if (inCollapsedSection) {
        if (ellipsisShown) {
          return null;
        }
        ellipsisShown = true;
        return (
          <tr key={idx}>
            <td colSpan={2} className={style.collapsedSection}>
              &hellip;
            </td>
          </tr>
        );
      }
      // We need both `hardware_id` and `name`; one of them is not enough. That's also how we identify
      // what to show in this very panel; see `selectedHardwareId` AND `selectedName` in the config.
      const valuePath = `${topicToRender}.status[:]{hardware_id=="${info.status.hardware_id}"}{name=="${
        info.status.name
      }"}.values[:]{key=="${kv.key}"}.value`;
      let openPlotPanelIconElem = null;
      if (kv.value && kv.value.length > 0) {
        openPlotPanelIconElem = !isNaN(Number(kv.value)) ? (
          <Icon
            fade
            dataTest="open-plot-icon"
            className={style.plotIcon}
            onClick={() => openSiblingPlotPanel(openSiblingPanel, valuePath)}
            tooltip="Line chart">
            <ChartLineVariantIcon />
          </Icon>
        ) : (
          <Icon
            fade
            className={style.stateTransitionsIcon}
            onClick={() => openSiblingStateTransitionsPanel(openSiblingPanel, valuePath)}
            tooltip="State Transitions">
            <DotsHorizontalIcon />
          </Icon>
        );
      }
      return (
        <tr key={idx} className={style.row}>
          {this._renderKeyValueCell(style.keyCell, kv.keyHtml, kv.key)}
          {this._renderKeyValueCell(style.valueCell, kv.valueHtml, kv.value, openPlotPanelIconElem)}
        </tr>
      );
    });
  };

  render() {
    const {
      info: { status, displayName },
      splitFraction,
      openSiblingPanel,
      topicToRender,
    } = this.props;
    const statusClass = style[`status-${LEVEL_NAMES[status.level] || "unknown"}`];

    return (
      <Flex scroll>
        {/* Additional container div allows the resize handle height to stretch to match the table height */}
        <div style={{ position: "relative", height: "100%" }}>
          {/* use data attribute as a hook for use in screenshot tests */}
          <ResizeHandle data-test-resizehandle splitFraction={splitFraction} onMouseDown={this._resizeMouseDown} />
          <KeyValueTable ref={this._tableRef}>
            <tbody>
              {/* Use a dummy row to fix the column widths */}
              <tr style={{ height: 0 }}>
                <td style={{ padding: 0, width: `${100 * splitFraction}%`, borderRight: "none" }} />
                <td style={{ padding: 0, borderLeft: "none" }} />
              </tr>
              <tr className={cx(style.section, statusClass)}>
                <Tooltip
                  placement="below"
                  contents={
                    <div>
                      Hardware ID: <code>{status.hardware_id}</code>
                      <br />
                      Name: <code>{status.name}</code>
                    </div>
                  }>
                  <th colSpan={2}>{displayName}</th>
                </Tooltip>
              </tr>
              <tr className={cx(style.row, statusClass)}>
                <td colSpan={2}>
                  {status.message}{" "}
                  <Icon
                    fade
                    className={style.stateTransitionsIcon}
                    onClick={() =>
                      openSiblingStateTransitionsPanel(
                        openSiblingPanel,
                        `${topicToRender}.status[:]{hardware_id=="${status.hardware_id}"}{name=="${
                          status.name
                        }"}.message`
                      )
                    }
                    tooltip="State Transitions">
                    <DotsHorizontalIcon />
                  </Icon>
                </td>
              </tr>
              {this._renderKeyValueSections(getFormattedKeyValues(status))}
            </tbody>
          </KeyValueTable>
        </div>
      </Flex>
    );
  }
}

export default DiagnosticStatus;
