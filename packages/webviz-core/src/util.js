// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// given a panel type, create a unique id for a panel
// with the type embedded within the id
// we need this because react-mosaic
export function getPanelIdForType(type: string): string {
  const factor = 1e10;
  const rnd = Math.round(Math.random() * factor).toString(36);
  // a panel id consists of its type, an exclimation mark for splitting, and a random val
  // because each panel id functions is the react 'key' for the react-mosiac-component layout
  // but also must encode the panel type for panel factory construction
  return `${type}!${rnd}`;
}

// given a panel id, extract the encoded panel type
export function getPanelTypeFromId(id: string): string {
  return id.split("!")[0];
}

export function downloadJSON(filename: string, objectToDownload: any) {
  const stringifedJSON = JSON.stringify(objectToDownload);
  const el = document.createElement("a");

  const blob = new Blob([stringifedJSON], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  el.download = `${filename}.json`;
  el.href = url;
  el.style.display = "none";

  // this guard clauses to satisfy flow
  const { body } = document;
  if (!body) {
    console.warn("could not create 'a' element - document.body is not found");
    return;
  }
  body.appendChild(el);
  el.click();
  body.removeChild(el);
}

export function arrayToPoint(v: ?[number, number, number]) {
  if (!v) {
    return null;
  }
  return { x: v[0], y: v[1], z: v[2] };
}

// returns the linear interpolation between a and b based on unit-range variable t
export function lerp(t: number, a: number, b: number): number {
  // Clamp t to (0, 1)
  t = Math.min(Math.max(t, 0.0), 1.0);
  if (a === b) {
    return a;
  }
  return a + t * (b - a);
}

// the following regex captures characters allowed in the value of a kv-pair in the query component
// of a URI, minus "&" and "+" because they are handled specially by browsers.
//   https://tools.ietf.org/html/rfc3986
//   query = *( pchar / "/" / "?" )
//   pchar = unreserved / pct-encoded / sub-delims / ":" / "@"
const QUERY_REGEXP = /([a-zA-Z0-9\-._~!$'()*,;=:@/?])|./gu;

// percent-encode a parameter for the query portion of a URL.
// leaves certain characters un-escaped that the URLSearchParams class does not,
// to improve readability of the URL.
export function encodeURLQueryParamValue(value: string): string {
  return value.replace(QUERY_REGEXP, (char, allowedChar) => {
    return allowedChar || encodeURIComponent(char);
  });
}

// extra boundary added for jest testing, since jsdom's Blob doesn't support .text()
export function downloadTextFile(text: string, fileName: string) {
  return downloadFiles([{ blob: new Blob([text]), fileName }]);
}

export function downloadFiles(files: { blob: Blob, fileName: string }[]) {
  const { body } = document;
  if (!body) {
    return;
  }

  const link = document.createElement("a");
  link.style.display = "none";
  body.appendChild(link);

  const urls = files.map((file) => {
    const url = window.URL.createObjectURL(file.blob);
    link.setAttribute("download", file.fileName);
    link.setAttribute("href", url);
    link.click();
    return url;
  });

  // remove the link after triggering download
  window.requestAnimationFrame(() => {
    body.removeChild(link);
    urls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
  });
}

// Equivalent to `number % modulus`, but always returns a positive number (given that modulus is
// a positive number). This is the same as the `%` in e.g. Python.
// See https://stackoverflow.com/a/4467559 and https://en.wikipedia.org/wiki/Modulo_operation
export function positiveModulo(number: number, modulus: number): number {
  return ((number % modulus) + modulus) % modulus;
}
