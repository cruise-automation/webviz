// flow-typed signature: b044e63537b6746c3cf63427819ab6d5
// flow-typed version: c6154227d1/classnames_v2.x.x/flow_>=v0.25.x <=v0.103.x

type $npm$classnames$Classes =
  | string
  | { [className: string]: * }
  | false
  | void
  | null;

declare module "classnames" {
  declare module.exports: (
    ...classes: Array<$npm$classnames$Classes | $npm$classnames$Classes[]>
  ) => string;
}

declare module "classnames/bind" {
  declare module.exports: $Exports<"classnames">;
}

declare module "classnames/dedupe" {
  declare module.exports: $Exports<"classnames">;
}
