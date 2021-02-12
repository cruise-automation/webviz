// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import { maxBy } from "lodash";
import React, { PureComponent } from "react";
import ReactAutocomplete from "react-autocomplete";
import { createPortal } from "react-dom";
import textWidth from "text-width";

import styles from "./Autocomplete.module.scss";
import fuzzyFilter from "webviz-core/src/util/fuzzyFilter";

const fontFamily = "'Inter UI', -apple-system, BlinkMacSystemFont, sans-serif";
const fontSize = 12;
function measureText(text: string): number {
  return textWidth(text, { family: fontFamily, size: fontSize }) + 3;
}

const rowHeight = parseInt(styles.rowHeight);

// <Autocomplete> is a Webviz-specific autocomplete with support for things like multiple
// autocompletes that seamlessly transition into each other, e.g. when building more complex
// strings like in the Plot panel.
//
// The multiple autocompletes doesn't work super well with react-autocomplete, so we have to
// reimplement some of its behaviour to make things work properly, such as the `_ignoreBlur`
// stuff. Mostly, though, we can lean on react-autocomplete to do the heavy lifting.
//
// For future reference, the reason `<ReactAutocomplete>` (and we) has to do `_ignoreBlur`, is that
// when you select an item from the autocomplete menu by clicking, it first triggers a `blur` event
// on the `<input>`, before triggering a `click` event. If we wouldn't ignore that `blur` event,
// we'd hide the menu before the `click` event even has a chance of getting fired. So the `blur`
// event has to be ignored, and the subsequent `focus` event also has to be ignored since it's kind
// of a "false" focus event. (In our case we just don't bother with ignoring the `focus` event since
// it doesn't cause any problems.)
type AutocompleteProps = {|
  items: mixed[],
  getItemValue: (mixed) => string,
  getItemText: (mixed) => string,
  filterText?: string,
  value?: string,
  selectedItem: ?mixed,
  onChange: (SyntheticInputEvent<HTMLInputElement>, string) => void,
  onSelect: (string, mixed, Autocomplete) => void, // eslint-disable-line no-use-before-define
  onBlur?: () => void,
  hasError: ?boolean,
  autocompleteKey?: ?string,
  placeholder?: ?string,
  autoSize?: boolean,
  sortWhenFiltering: boolean,
  clearOnFocus: boolean, // only for uncontrolled use (when onChange is not set)
  minWidth: number,
  menuStyle?: any,
  inputStyle?: any,
  disableAutoSelect?: boolean,
|};

type AutocompleteState = {|
  focused: boolean,
  showAllItems: boolean,
  value?: string,
|};

function defaultGetText(name: string) {
  return function(item: mixed) {
    if (typeof item === "string") {
      return item;
    } else if (item && typeof item === "object" && typeof item.value === "string") {
      return item.value;
    }
    throw new Error(`you need to provide an implementation of ${name}`);
  };
}

export default class Autocomplete extends PureComponent<AutocompleteProps, AutocompleteState> {
  _autocomplete: { current: null | Autocomplete };
  _ignoreFocus: boolean = false;
  _ignoreBlur: boolean = false;

  static defaultProps = {
    getItemText: defaultGetText("getItemText"),
    getItemValue: defaultGetText("getItemValue"),
    sortWhenFiltering: true,
    clearOnFocus: false,
    minWidth: 100,
  };

  constructor(props: AutocompleteProps) {
    super(props);
    this._autocomplete = React.createRef<ReactAutocomplete>();
    this.state = { focused: false, showAllItems: false };
  }

  // When we lose the scrollbar, we can safely set `showAllItems: false` again, because all items
  // will be in view anyway. We cannot set it to false earlier, as `<ReactAutocomplete>` may have a
  // reference to the highlighted element, which can cause an error if we hide it.
  componentDidUpdate() {
    if (
      this._autocomplete.current &&
      this._autocomplete.current.refs.menu &&
      this._autocomplete.current.refs.menu.scrollHeight <= this._autocomplete.current.refs.menu.clientHeight &&
      this.state.showAllItems
    ) {
      this.setState({ showAllItems: false });
    }
  }

  setSelectionRange(selectionStart: number, selectionEnd: number) {
    if (this._autocomplete.current && this._autocomplete.current.refs.input) {
      this._autocomplete.current.refs.input.setSelectionRange(selectionStart, selectionEnd);
    }
    this.setState({ focused: true });
  }

  focus() {
    if (this._autocomplete.current && this._autocomplete.current.refs.input) {
      this._autocomplete.current.refs.input.focus();
    }
  }

  blur() {
    if (this._autocomplete.current && this._autocomplete.current.refs.input) {
      this._autocomplete.current.refs.input.blur();
    }
    this._ignoreBlur = false;
    this.setState({ focused: false });
    if (this.props.onBlur) {
      this.props.onBlur();
    }
  }

  _onFocus = () => {
    if (this._ignoreFocus) {
      return;
    }
    const { clearOnFocus } = this.props;
    if (
      this._autocomplete.current &&
      this._autocomplete.current.refs.input &&
      document.activeElement === this._autocomplete.current.refs.input
    ) {
      this.setState({ focused: true });
      if (clearOnFocus) {
        this.setState({ value: "" });
      }
    }
  };

  // Wait for a mouseup event, and check in the mouseup event if anything was actually selected, or
  // if it just was a click without a drag. In the latter case, select everything. This is very
  // similar to how, say, the browser bar in Chrome behaves.
  _onMouseDown = (_event: SyntheticMouseEvent<HTMLInputElement>) => {
    if (this.props.disableAutoSelect) {
      return;
    }
    if (this.state.focused) {
      return;
    }
    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener("mouseup", onMouseUp, true);

      if (
        this._autocomplete.current &&
        this._autocomplete.current.refs.input &&
        // Make sure that the element is actually still focused.
        document.activeElement === this._autocomplete.current.refs.input
      ) {
        if (
          this._autocomplete.current.refs.input.selectionStart === this._autocomplete.current.refs.input.selectionEnd
        ) {
          this._autocomplete.current.refs.input.select();
          e.stopPropagation();
          e.preventDefault();
        }
        // Also set `state.focused` for good measure, since we know here that we're focused.
        this.setState({ focused: true });
      }
    };
    document.addEventListener("mouseup", onMouseUp, true);
  };

  _onBlur = () => {
    if (this._ignoreBlur) {
      return;
    }
    if (
      this._autocomplete.current &&
      this._autocomplete.current.refs.input &&
      document.activeElement === this._autocomplete.current.refs.input
    ) {
      // Bail if we actually still are focused.
      return;
    }
    this.setState({ focused: false, value: undefined });
    if (this.props.onBlur) {
      this.props.onBlur();
    }
  };

  _onChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    if (this.props.onChange) {
      this.props.onChange(event, event.target.value);
    } else {
      this.setState({ value: event.target.value });
    }
  };

  // Make sure the input field gets focused again after selecting, in case we're doing multiple
  // autocompletes. We pass in `this` to `onSelect` in case the user of this component wants to call
  // `blur()`.
  _onSelect = (value: string, item: any) => {
    if (this._autocomplete.current && this._autocomplete.current.refs.input) {
      this._autocomplete.current.refs.input.focus();
      this.setState({ focused: true, value: undefined }, () => {
        this.props.onSelect(value, item, this);
      });
    }
  };

  // When scrolling down by even a little bit, just show all items. In most cases people won't
  // do this and instead will type more text to narrow down their autocomplete.
  _onScroll = (event: SyntheticMouseEvent<HTMLDivElement>) => {
    if (event.currentTarget.scrollTop > 0) {
      // Never set `showAllItems` to false here, as `<ReactAutocomplete>` may have a reference to
      // the highlighted element. We only set it back to false in `componentDidUpdate`.
      this.setState({ showAllItems: true });
    }
  };

  _onKeyDown = (event: SyntheticKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" || (event.key === "Enter" && this.props.items.length === 0)) {
      this.blur();
    }
  };

  render() {
    const {
      autocompleteKey,
      autoSize,
      getItemValue,
      getItemText,
      items,
      placeholder,
      selectedItem,
      value = this.state.value ?? (selectedItem ? getItemText(selectedItem) : null),
      filterText = value,
      sortWhenFiltering,
      minWidth,
      menuStyle = {},
      inputStyle = {},
    } = this.props;
    const autocompleteItems = fuzzyFilter(items, filterText, getItemText, sortWhenFiltering);

    const { hasError = autocompleteItems.length === 0 && value?.length } = this.props;

    const open = this.state.focused && autocompleteItems.length > 0;
    if (!open) {
      this._ignoreBlur = false;
    }

    const selectedItemValue = selectedItem != null ? getItemValue(selectedItem) : null;
    return (
      <ReactAutocomplete
        open={open}
        items={autocompleteItems}
        getItemValue={getItemValue}
        renderItem={(item, isHighlighted) => {
          const itemValue = getItemValue(item);
          return (
            <div
              key={itemValue}
              data-highlighted={isHighlighted}
              data-test-auto-item
              className={cx(styles.autocompleteItem, {
                [styles.highlighted]: isHighlighted,
                [styles.selected]: selectedItemValue != null && itemValue === selectedItemValue,
              })}>
              {getItemText(item)}
            </div>
          );
        }}
        onChange={this._onChange}
        onSelect={this._onSelect}
        value={value || ""}
        inputProps={{
          className: cx(styles.input, {
            [styles.inputError]: hasError,
            [styles.placeholder]: !value,
          }),
          autoCorrect: "off",
          autoCapitalize: "off",
          spellCheck: "false",
          placeholder,
          style: {
            ...inputStyle,
            fontFamily,
            fontSize,
            width: autoSize ? Math.max(measureText(value || placeholder || ""), minWidth) : "100%",
          },
          onFocus: this._onFocus,
          onBlur: this._onBlur,
          onMouseDown: this._onMouseDown,
          onKeyDown: this._onKeyDown,
        }}
        renderMenu={(menuItems, val, style) => {
          // Hacky virtualization. Either don't show all menuItems (typical when the user is still
          // typing in the autcomplete), or do show them all (once the user scrolls). Not the most
          // sophisticated, but good enough!
          const maxNumberOfItems = Math.ceil(window.innerHeight / rowHeight + 10);
          const menuItemsToShow =
            this.state.showAllItems || menuItems.length <= maxNumberOfItems * 2
              ? menuItems
              : menuItems.slice(0, maxNumberOfItems).concat(menuItems.slice(-maxNumberOfItems));

          // The longest string might not be the widest (e.g. "|||" vs "www"), but this is
          // quite a bit faster, so we throw in a nice padding and call it good enough! :-)
          const width = measureText(getItemText(maxBy(autocompleteItems, (item) => getItemText(item).length))) + 50;
          const maxHeight = `calc(100vh - 10px - ${style.top}px)`;

          return (
            <div
              className={styles.root}
              key={autocompleteKey /* So we scroll to the top when selecting */}
              style={
                // If the autocomplete would fall off the screen, pin it to the right.
                style.left + width <= window.innerWidth
                  ? { ...menuStyle, ...style, width, maxWidth: "100%", maxHeight }
                  : { ...menuStyle, ...style, width, maxWidth: "100%", maxHeight, left: "auto", right: 0 }
              }
              onScroll={this._onScroll}>
              {/* Have to wrap onMouseEnter and onMouseLeave in a separate <div>, as react-autocomplete
               * would override them on the root <div>. */}
              <div onMouseEnter={() => (this._ignoreBlur = true)} onMouseLeave={() => (this._ignoreBlur = false)}>
                {menuItemsToShow}
              </div>
            </div>
          );
        }}
        renderMenuWrapper={(menu) => document.body && createPortal(menu, document.body)}
        ref={this._autocomplete}
        wrapperStyle={{ flex: "1 1 auto", overflow: "hidden", marginLeft: 6 }}
      />
    );
  }
}
