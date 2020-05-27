import { Time } from "./types";

/*
 * Checks ROS-time equality.
 */
export const areSame = (t1: Time, t2: Time) => t1.sec === t2.sec && t1.nsec === t2.nsec;

/*
 * Compare two times, returning a negative value if the right is greater or a
 * positive value if the left is greater or 0 if the times are equal useful to
 * supply to Array.prototype.sort
 */
export const compare = (left: Time, right: Time) => {
  const secDiff = left.sec - right.sec;
  return secDiff || left.nsec - right.nsec;
};

const fixTime = (t: Time): Time => {
  // Equivalent to fromNanoSec(toNanoSec(t)), but no chance of precision loss.
  // nsec should be non-negative, and less than 1e9.
  let { sec, nsec } = t;
  while (nsec > 1e9) {
    nsec -= 1e9;
    sec += 1;
  }
  while (nsec < 0) {
    nsec += 1e9;
    sec -= 1;
  }
  return { sec, nsec };
};

export const subtractTimes = ({ sec: sec1, nsec: nsec1 }: Time, { sec: sec2, nsec: nsec2 }: Time): Time => {
  return fixTime({ sec: sec1 - sec2, nsec: nsec1 - nsec2 });
};
