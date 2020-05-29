import { Input, Messages } from "ros";
import { Marker, MarkerTypes } from "./markers";

export const inputs = [];
export const output = "/webviz_node/";

// Populate 'Input' with a parameter to properly type your inputs, e.g. 'Input<"/your_input_topic">'
const publisher = (message: Input<>): Messages.visualization_msgs__MarkerArray => {
  const markers: Marker[] = [
    new Marker({
      /* e.g 'type: MarkerTypes.ARROW' */
    }),
  ];
  return {
    markers,
  };
};

export default publisher;
