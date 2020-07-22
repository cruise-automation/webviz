// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import WarnIcon from "@mdi/svg/svg/alert.svg";
import InfoIcon from "@mdi/svg/svg/bell.svg";
import NotificationIcon from "@mdi/svg/svg/close-circle.svg";
import moment from "moment";
import * as React from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";
import uuid from "uuid";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import Modal, { Title } from "webviz-core/src/components/Modal";
import renderToBody from "webviz-core/src/components/renderToBody";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import minivizAPI from "webviz-core/src/util/minivizAPI";
import {
  type DetailsType,
  type NotificationType,
  setNotificationHandler,
  unsetNotificationHandler,
} from "webviz-core/src/util/sendNotification";
import type { NotificationSeverity } from "webviz-core/src/util/sendNotification";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

type NotificationMessage = {
  +id: string,
  +message: string,
  +details: DetailsType,
  +read: boolean,
  +created: Date,
  +severity: NotificationSeverity,
};

const Container = styled.div`
  height: 100%;
  display: flex;
  flex: 1 1 auto;
  justify-content: flex-end;
  align-items: center;
  padding: 0px 8px;
  transition: background-color 200ms linear;
  background-color: ${(props) =>
    props.flash
      ? tinyColor(props.color)
          .darken(0)
          .toRgbString()
      : "none"};
  color: ${(props) => (props.flash ? "black" : props.unread ? props.color : "rgba(255, 255, 255, 0.5)")};
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

const FLASH_DURATION_MILLIS = 1000;

const SItemContainer = styled.div`
  color: ${(props) => props.color};
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

const SText = styled.div`
  flex: 1 1 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 14px;
`;

const STime = styled.div`
  color: ${colors.TEXT_MUTED};
  font-size: 11px;
  display: flex;
  flex: 0 0 24px;
  align-items: center;
  justify-content: flex-end;
`;

type NotificationItemProps = {
  notification: NotificationMessage,
  onClick: () => void,
};

const displayPropsBySeverity = {
  error: {
    color: colors.RED1,
    name: "Errors",
    IconSvg: NotificationIcon,
  },
  warn: {
    color: colors.YELLOW1,
    name: "Warnings",
    IconSvg: WarnIcon,
  },
  info: {
    color: colors.BLUEL1,
    name: "Messages",
    IconSvg: InfoIcon,
  },
};
const getColorForSeverity = (severity: NotificationSeverity): string =>
  displayPropsBySeverity[severity]?.color ?? colors.BLUEL1;

function NotificationItem(props: NotificationItemProps) {
  const { notification, onClick } = props;
  const color = getColorForSeverity(notification.severity);
  const duration = moment.duration(moment().diff(moment(notification.created)));
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
    <SItemContainer onClick={onClick} color={color}>
      <SText className="notification-message">{notification.message}</SText>
      {!notification.read && <div style={{ paddingRight: 8 }}>•</div>}
      <STime>{timeString}</STime>
    </SItemContainer>
  );
}

type NotificationListProps = {
  notifications: NotificationMessage[],
  onClick: (err: NotificationMessage) => void,
};

// exported for storybook
export class NotificationList extends React.PureComponent<NotificationListProps> {
  render() {
    const { notifications, onClick } = this.props;
    return (
      <Menu style={{ marginTop: 2 }}>
        {notifications.map((er) => (
          <NotificationItem key={er.id} notification={er} onClick={() => onClick(er)} />
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
export function showNotificationModal(notification: NotificationMessage): void {
  const { renderNotificationDetails } = getGlobalHooks();
  let details = renderNotificationDetails ? renderNotificationDetails(notification.details) : notification.details;
  if (details instanceof Error) {
    details = details.stack;
  }

  const modal = renderToBody(
    <Modal onRequestClose={() => modal.remove()}>
      <ModalBody>
        <Title style={{ color: getColorForSeverity(notification.severity) }}>{notification.message}</Title>
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
  notifications: NotificationMessage[],
  showMostRecent: boolean,
  showList: boolean,
};

type Props = {
  onNotification?: (message: string, details: DetailsType) => void,
};

export default class NotificationDisplay extends React.PureComponent<Props, State> {
  state = {
    notifications: [],
    showMostRecent: false,
    showList: false,
  };

  hideTimeout: TimeoutID;

  componentDidMount() {
    setNotificationHandler(
      (message: string, details: DetailsType, type: NotificationType, severity: NotificationSeverity): void => {
        this.setState((state: State) => {
          const newNotifications = [{ id: uuid(), created: new Date(), read: false, message, details, severity }];
          // shift notifications in to the front of the array and keep a max of 100
          const notifications = newNotifications.concat(state.notifications).slice(0, 100);
          return {
            ...state,
            notifications,
            showMostRecent: true,
          };
        });

        if (this.props.onNotification) {
          this.props.onNotification(message, details);
        }

        clearTimeout(this.hideTimeout);

        this.hideTimeout = setTimeout(() => {
          this.setState({ showMostRecent: false });
        }, FLASH_DURATION_MILLIS);

        // Notify the iFrame from here, since we should always have a `window` here since we're not
        // in a React component (and not in a worker).
        minivizAPI.postNotificationMessage({ message, details, type, severity });
      }
    );
  }

  componentWillUnmount() {
    unsetNotificationHandler();
  }

  toggleNotificationList = () => {
    this.setState((state) => {
      const { showList } = state;
      if (!showList) {
        return { showList: true };
      }
      // mark items read on closed
      return {
        showList: false,
        notifications: state.notifications.map((err) => ({ ...err, read: true })),
      };
    });
  };

  render() {
    const { notifications, showMostRecent, showList } = this.state;
    const unreadCount = notifications.reduce((acc, err) => acc + (err.read ? 0 : 1), 0);

    const severity = notifications[0]?.severity ?? "error";
    const { name, color, IconSvg } = displayPropsBySeverity[severity];
    const hasUnread = unreadCount > 0;

    return (
      <Container flash={showMostRecent} unread={hasUnread} color={color}>
        {!!notifications.length && (
          <ChildToggle position="below" isOpen={showList} onToggle={this.toggleNotificationList}>
            <div style={{ display: "flex", flex: "1 1 auto", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  flex: "none",
                  alignItems: "center",
                }}>
                <Icon small tooltip={name}>
                  <IconSvg />
                </Icon>
              </div>
              <Fader visible={showMostRecent} style={{ paddingLeft: 5, cursor: "pointer" }}>
                {notifications[0].message}
              </Fader>
              {unreadCount > 1 && `(${unreadCount})`}
            </div>
            <NotificationList notifications={notifications} onClick={showNotificationModal} />
          </ChildToggle>
        )}
      </Container>
    );
  }
}
