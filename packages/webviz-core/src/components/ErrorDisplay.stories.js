// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import moment from "moment";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import ErrorDisplay, { ErrorList, showErrorModal } from "webviz-core/src/components/ErrorDisplay";
import reportError from "webviz-core/src/util/reportError";

storiesOf("<ErrorDisplay>", module)
  .addDecorator(withScreenshot({ delay: 1000 }))
  .add("No errors", () => {
    return (
      <div style={{ padding: 10 }}>
        <div>there should be nothing here with no errors present</div>
        <div style={{ width: 300 }}>
          <ErrorDisplay />
        </div>
      </div>
    );
  })
  .add("With one error", () => {
    class Wrapper extends React.Component<any> {
      componentDidMount() {
        reportError("Something bad happened", "This error is on purpose - it comes from the story", "app");
      }

      addError() {
        reportError(`${Math.floor(Math.random() * 1000)} new error`, "some details", "app");
      }

      render() {
        return (
          <div style={{ padding: 10 }}>
            <div style={{ width: 300 }}>
              <ErrorDisplay />
            </div>
            <div style={{ paddingTop: 20 }}>
              <button onClick={this.addError}>add error</button>
            </div>
          </div>
        );
      }
    }
    return <Wrapper />;
  })
  .add("expanded with 4 errors", () => {
    class Wrapper extends React.Component<any> {
      el: ?HTMLDivElement;
      componentDidMount() {
        reportError("Something bad happened 1", "This error is on purpose - it comes from the story", "app");
        reportError("Something bad happened 2", "This error is on purpose - it comes from the story", "app");
        reportError("Something bad happened 3", "This error is on purpose - it comes from the story", "app");
        reportError("Something bad happened 4", "This error is on purpose - it comes from the story", "app");
        if (this.el) {
          const icon = this.el.querySelector(".icon");
          if (icon) {
            icon.click();
          }
        }
      }

      addError() {
        reportError(`${Math.floor(Math.random() * 1000)} new error`, "some details", "app");
      }

      render() {
        return (
          <div style={{ padding: 10 }} ref={(el) => (this.el = el)}>
            <div style={{ width: 300 }}>
              <ErrorDisplay />
            </div>
            <div style={{ paddingTop: 20 }}>
              <button onClick={this.addError}>add error</button>
            </div>
          </div>
        );
      }
    }
    return <Wrapper />;
  })
  .add("error list", () => {
    // make the container very short to test scrolling
    const style = { width: 400, height: 150, margin: 20 };
    const date = new Date();
    const errors = [
      {
        id: "1",
        message: "Error 1",
        details: "Some error details",
        read: true,
        created: moment(date)
          .subtract(307, "minutes")
          .toDate(),
      },
      {
        id: "2",
        message: "Some very long error message that should be truncated",
        details: "Some error details",
        read: true,
        created: moment(date)
          .subtract(31, "minutes")
          .toDate(),
      },
      {
        id: "5",
        message: "Foo foo baz",
        details: "Some error details",
        read: false,
        created: moment(date)
          .subtract(17, "minutes")
          .toDate(),
      },
      {
        id: "4",
        message: "Foo bar baz",
        details: "Some error details",
        read: false,
        created: moment(date)
          .subtract(11, "minutes")
          .toDate(),
      },
      {
        id: "3",
        message: "Some fake error",
        details: "Foo bar baz this is a long-ish error details string",
        read: false,
        created: moment(date)
          .subtract(3, "seconds")
          .toDate(),
      },
    ];
    return (
      <div style={style}>
        <ErrorList errors={errors} onClick={() => {}} />
      </div>
    );
  })
  .add("Error Modal", () => {
    showErrorModal({
      id: "1",
      message: "Error 1",
      details: "Some error details",
      read: false,
      created: new Date(),
    });
    return <div />;
  });
