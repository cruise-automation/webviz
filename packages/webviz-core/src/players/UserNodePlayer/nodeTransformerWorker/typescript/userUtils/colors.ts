// go/styles
export const COLORS = {
  DARK: { r: 0.03, g: 0.03, b: 0.04, a: 1 },
  DARK1: { r: 0.07, g: 0.07, b: 0.08, a: 1 },
  DARK2: { r: 0.1, g: 0.1, b: 0.12, a: 1 },
  DARK3: { r: 0.14, g: 0.14, b: 0.16, a: 1 },
  DARK4: { r: 0.18, g: 0.18, b: 0.2, a: 1 },
  DARK5: { r: 0.21, g: 0.21, b: 0.24, a: 1 },
  DARK6: { r: 0.25, g: 0.25, b: 0.28, a: 1 },
  DARK7: { r: 0.29, g: 0.29, b: 0.32, a: 1 },
  DARK8: { r: 0.33, g: 0.33, b: 0.36, a: 1 },
  DARK9: { r: 0.38, g: 0.38, b: 0.4, a: 1 },
  LIGHT: { r: 1.0, g: 1.0, b: 1.0, a: 1 },
  LIGHT1: { r: 0.94, g: 0.94, b: 0.94, a: 1 },
  LIGHT2: { r: 0.79, g: 0.79, b: 0.8, a: 1 },
  GRAY: { r: 0.62, g: 0.62, b: 0.64, a: 1 },
  GRAY2: { r: 0.18, g: 0.17, b: 0.2, a: 1 },
  MAGENTAL1: { r: 0.88, g: 0.37, b: 0.98, a: 1 },
  MAGENTA: { r: 0.78, g: 0.24, b: 0.92, a: 1 },
  MAGENTA1: { r: 0.69, g: 0.14, b: 0.84, a: 1 },
  PURPLEL1: { r: 0.6, g: 0.53, b: 1.0, a: 1 },
  PURPLE: { r: 0.49, g: 0.42, b: 1.0, a: 1 },
  PURPLE1: { r: 0.41, g: 0.35, b: 0.96, a: 1 },
  BLUEL1: { r: 0.27, g: 0.65, b: 1.0, a: 1 },
  BLUE: { r: 0.14, g: 0.56, b: 1.0, a: 1 },
  BLUE1: { r: 0.06, g: 0.44, b: 0.95, a: 1 },
  TEALL1: { r: 0.16, g: 0.75, b: 0.82, a: 1 },
  TEAL: { r: 0.0, g: 0.66, b: 0.76, a: 1 },
  TEAL1: { r: 0.0, g: 0.56, b: 0.68, a: 1 },
  GREENL1: { r: 0.1, g: 0.74, b: 0.54, a: 1 },
  GREEN: { r: 0.0, g: 0.64, b: 0.46, a: 1 },
  GREEN1: { r: 0.0, g: 0.53, b: 0.41, a: 1 },
  LIMEL1: { r: 0.42, g: 0.84, b: 0.44, a: 1 },
  LIME: { r: 0.29, g: 0.76, b: 0.32, a: 1 },
  LIME1: { r: 0.19, g: 0.68, b: 0.29, a: 1 },
  YELLOWL1: { r: 0.96, g: 0.83, b: 0.35, a: 1 },
  YELLOW: { r: 0.97, g: 0.75, b: 0.0, a: 1 },
  YELLOW1: { r: 0.92, g: 0.66, b: 0.0, a: 1 },
  ORANGEL1: { r: 0.99, g: 0.54, b: 0.26, a: 1 },
  ORANGE: { r: 0.97, g: 0.42, b: 0.11, a: 1 },
  ORANGE1: { r: 0.9, g: 0.33, b: 0.04, a: 1 },
  REDL1: { r: 1.0, g: 0.42, b: 0.51, a: 1 },
  RED: { r: 0.96, g: 0.29, b: 0.4, a: 1 },
  RED1: { r: 0.86, g: 0.21, b: 0.33, a: 1 },
  RED2: { r: 1.0, g: 0.49, b: 0.59, a: 1 }
};

export const SEMANTIC_CLASS_TO_COLOR_MAP = {
  "1": COLORS.BLUE, // CAR
  "2": COLORS.TEAL, // HUMAN
  "3": COLORS.PURPLE, // BIKE
  "4": COLORS.PURPLE1, // MOTORCYCLE
  "5": COLORS.BLUE, // TRUCK
  "6": COLORS.BLUE, // BUS
  "7": COLORS.BLUE, // SCHOOL_BUS
  "8": COLORS.RED, // EMV
  "9": COLORS.BLUE, // TRAIN
  "10": COLORS.BLUE, // ANIMAL
  "2000": COLORS.LIME, // STATIC_UNKNOWN
  defaultColor: COLORS.LIME
};
