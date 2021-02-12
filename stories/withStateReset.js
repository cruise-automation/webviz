import * as monacoApi from "monaco-editor/esm/vs/editor/editor.api";
import React, { useEffect, useState } from "react";

import { resetRenderCountsForTests } from "webviz-core/src/panels/NumberOfRenders";

const StoryWrapper = (props) => {
  const [showStory, setShowStory] = useState(false);

  // Reset the state before rendering the next story
  useEffect(() => {
    // Remove leftover modals from the previous story
    document.querySelectorAll("[data-modalcontainer]").forEach((el) => el.remove());
    localStorage.clear();

    // Reset the renderCounts for the NumberOfRenders panel
    resetRenderCountsForTests();

    // Reset cached monacoApi state
    monacoApi.editor.getModels().forEach((model) => model.dispose());

    // Unmount the old story before rendering the next one to clear out any stored state
    setShowStory(false);
    const timer = setImmediate(() => {
      setShowStory(true);
    });
    return () => clearTimeout(timer);
  }, [props]);

  return (showStory && React.createElement(props.storyComponent)) || null;
};

export default function withStateReset(storyComponent) {
  return <StoryWrapper storyComponent={storyComponent} />;
}
