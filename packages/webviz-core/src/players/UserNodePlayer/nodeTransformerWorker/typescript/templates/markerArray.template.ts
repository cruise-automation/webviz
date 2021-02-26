import { Input, Messages } from "ros";
import { Marker, MarkerTypes } from "./markers";

// Replace these with the topic names that you want to use
export const inputs = ["/PEREGRINE_0__ZIPNAV"];
export const output = "/webviz_node/zipnav_3d";

type GlobalVariables = {}; // Advanced feature; read docs / ask around to learn more.

const publisher = (
  message: Input<"/PEREGRINE_0__ZIPNAV">, // Update this to match `inputs`
  globalVars: GlobalVariables
): Messages.visualization_msgs__MarkerArray => {
  const markers: Marker[] = [
    new Marker({
      type: MarkerTypes.TEXT, // See http://wiki.ros.org/rviz/DisplayTypes/Marker
      header: { frame_id: "map", stamp: { sec:0, nsec: 0 }, seq: 0 },
      pose: {
        position: {
          x: message.message.position_ned_m[1],
          y: message.message.position_ned_m[0],
          z: -message.message.position_ned_m[2]
        },
        orientation: { x: 0, y: 0, z: 0, w: 1 }
      },
      text: "zippyzip"
    })
  ];
  return { markers };
};

export default publisher;
