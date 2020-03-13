// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BellIcon from "@mdi/svg/svg/bell.svg";
import moment from "moment";
import * as React from "react";
import styled from "styled-components";
import uuid from "uuid";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import Modal, { Title } from "webviz-core/src/components/Modal";
import renderToBody from "webviz-core/src/components/renderToBody";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { postMessageToIframeHost } from "webviz-core/src/util/iframeUtils";
import { type DetailsType, type ErrorType, setErrorHandler, unsetErrorHandler } from "webviz-core/src/util/reportError";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

type ErrorMessage = {
  +id: string,
  +message: string,
  +details: DetailsType,
  +read: boolean,
  +created: Date,
};

const Container = styled.div`
  height: 100%;
  display: flex;
  flex: 1 1 auto;
  justify-content: flex-end;
  align-items: center;
  padding: 0px 8px;
  transition: background-color 200ms linear;
  background-color: ${(props) => (props.flash ? colors.RED : "")};
  color: ${(props) => (props.flash ? "white" : props.unread ? colors.RED : "rgba(255, 255, 255, 0.5)")};
`;

const Fader = styled.span`
  text-align: center;
  font-size: 12px;
  padding-right: 2px
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 200ms linear;
  display: inline-block;
  max-width: 500px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FLASH_DURATION_MILLIS = 3000;

const ErrorItemContainer = styled.div`
  color: ${colors.RED};
  cursor: pointer;
  display: flex;
  flex-direction: row;
  padding: 8px;
  min-width: 280px;
  max-width: 500px;
  font-size: 15px;
  &:hover {
    background-color: rgba(0, 0, 0, 0.2);
  }
`;

const ErrorText = styled.div`
  flex: 1 1 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 14px;
`;

const ErrorTime = styled.div`
  color: ${colors.TEXT_MUTED};
  font-size: 11px;
  display: flex;
  flex: 0 0 24px;
  align-items: center;
  justify-content: flex-end;
`;

type ErrorItemProps = {
  error: ErrorMessage,
  onClick: () => void,
};

function ErrorItem(props: ErrorItemProps) {
  const { error, onClick } = props;
  const duration = moment.duration(moment().diff(moment(error.created)));
  const seconds = duration.asSeconds();
  let timeString = "";
  if (seconds < 60) {
    timeString = `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    timeString = `${Math.round(seconds / 60)}m`;
  } else {
    timeString = `${Math.round(seconds / 3600)}h`;
  }
  return (
    <ErrorItemContainer onClick={onClick}>
      <ErrorText className="error-message">{error.message}</ErrorText>
      {!error.read && <div style={{ paddingRight: 8 }}>•</div>}
      <ErrorTime>{timeString}</ErrorTime>
    </ErrorItemContainer>
  );
}

type ErrorListProps = {
  errors: ErrorMessage[],
  onClick: (err: ErrorMessage) => void,
};

// exported for storybook
export class ErrorList extends React.PureComponent<ErrorListProps> {
  render() {
    const { errors, onClick } = this.props;
    return (
      <Menu style={{ marginTop: 2 }}>
        {errors.map((er, index) => (
          <ErrorItem key={er.id} error={er} onClick={() => onClick(er)} />
        ))}
      </Menu>
    );
  }
}

const ModalBody = styled.div`
  padding: 16px;
  max-width: 600px;
  min-width: 300px;
  max-height: 600px;
  overflow: auto;
`;

// Exporting for tests.
export function showErrorModal(error: ErrorMessage): void {
  const { renderErrorDetails } = getGlobalHooks();
  let details = renderErrorDetails ? renderErrorDetails(error.details) : error.details;
  if (details instanceof Error) {
    details = details.stack;
  }

  const modal = renderToBody(
    <Modal onRequestClose={() => modal.remove()}>
      <ModalBody>
        <Title style={{ color: colors.RED }}>{error.message}</Title>
        {typeof details === "string" ? (
          <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.3 }}>{details}</pre>
        ) : (
          details || "No details provided"
        )}
      </ModalBody>
    </Modal>
  );
}

type State = {
  errors: ErrorMessage[],
  showMostRecent: boolean,
  showErrorList: boolean,
};

type Props = {
  onError?: (message: string, details: DetailsType) => void,
};

export default class ErrorDisplay extends React.PureComponent<Props, State> {
  state = {
    errors: [],
    showMostRecent: false,
    showErrorList: false,
  };

  hideTimeout: TimeoutID;

  componentDidMount() {
    setErrorHandler(
      (message: string, details: DetailsType, type: ErrorType): void => {
        this.setState((state: State) => {
          const newErrors = [{ id: uuid(), created: new Date(), message, details, read: false }];
          // shift errors in to the front of the array and keep a max of 100
          const errors = newErrors.concat(state.errors).slice(0, 100);
          return {
            ...state,
            showMostRecent: true,
            errors,
          };
        });

        if (this.props.onError) {
          this.props.onError(message, details);
        }

        clearTimeout(this.hideTimeout);

        this.hideTimeout = setTimeout(() => {
          this.setState({ showMostRecent: false });
        }, FLASH_DURATION_MILLIS);

        // Notify the iFrame from here, since we should always have a `window` here since we're not
        // in a React component (and not in a worker).
        postMessageToIframeHost({ type: "webviz-error", data: { message, details, type } });
      }
    );
  }

  componentWillUnmount() {
    unsetErrorHandler();
  }

  toggleErrorList = () => {
    this.setState((state) => {
      const { showErrorList } = state;
      if (!showErrorList) {
        return { showErrorList: true };
      }
      // mark items read on closed
      return {
        showErrorList: false,
        errors: state.errors.map((err) => ({ ...err, read: true })),
      };
    });
  };

  render() {
    const { errors, showMostRecent, showErrorList } = this.state;
    const unreadCount = errors.reduce((acc, err) => acc + (err.read ? 0 : 1), 0);
    const hasUnread = unreadCount > 0;
    return (
      <Container flash={showMostRecent} unread={hasUnread}>
        {!!errors.length && (
          <ChildToggle position="below" isOpen={showErrorList} onToggle={this.toggleErrorList}>
            <div style={{ display: "flex", flex: "1 1 auto", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  flex: "none",
                  alignItems: "center",
                  color: showMostRecent && colors.RED1,
                }}>
                <Fader visible={hasUnread}>{unreadCount || ""}</Fader>
                <Icon small tooltip="Errors">
                  <BellIcon />
                </Icon>
              </div>
              <Fader visible={showMostRecent} style={{ paddingLeft: 5, cursor: "pointer" }}>
                {errors[0].message}
              </Fader>
            </div>
            <ErrorList errors={errors} onClick={showErrorModal} />
          </ChildToggle>
        )}
      </Container>
    );
  }
}
