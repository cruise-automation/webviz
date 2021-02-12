// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BaseButton from "@cruise-automation/button";
import cx from "classnames";
import * as React from "react";

import Tooltip from "webviz-core/src/components/Tooltip";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export type Props = {
  ...React.ElementConfig<typeof BaseButton>,
  innerRef: ?React.Ref<typeof BaseButton>,
  tooltipProps?: $Shape<{ ...React.ElementConfig<typeof Tooltip> }>,
  style: { [string]: string | number },
  isPrimary?: boolean,
};

export type { BaseButton };

// Wrapper for BaseButton which uses our standard Tooltip styling.
export default class Button extends React.Component<Props> {
  static defaultProps = {
    innerRef: undefined,
    style: {},
  };

  render() {
    const {
      tooltip,
      innerRef,
      disabled,
      className,
      tooltipProps,
      onClick,
      onMouseUp,
      onMouseLeave,
      isPrimary,
      style,
      ...otherProps
    } = this.props;
    // overwrite the primary color for Webviz
    // using `isPrimary` instead of `primary` now to prevent global UI changes until we are ready to migrate all styles
    const styleAlt = isPrimary ? { ...style, backgroundColor: colors.PRIMARY } : style;

    const eventHandlers = disabled ? {} : { onClick, onMouseUp, onMouseLeave };

    // replace disabled={true} with className="disabled" in order to allow tooltips on disabled buttons
    const newClassName = cx(className, { disabled });

    if (tooltip) {
      return (
        <Tooltip contents={tooltip} {...tooltipProps}>
          {/* Extra div allows Tooltip to insert the necessary event listeners */}
          <div style={{ display: "inline-flex" }}>
            <BaseButton style={styleAlt} {...otherProps} {...eventHandlers} className={newClassName} ref={innerRef} />
          </div>
        </Tooltip>
      );
    }
    return <BaseButton style={styleAlt} {...otherProps} {...eventHandlers} className={newClassName} ref={innerRef} />;
  }
}
