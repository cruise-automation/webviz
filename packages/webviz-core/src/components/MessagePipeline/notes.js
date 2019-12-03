import * as React from 'react';

function example() {

    <MessageHistory paths={["/my_topic.foo.bar"]}>
        {({ itemsByPath, metadataByPath, cleared, startTime }) => {
            return null;
        }}
    </MessageHistory>


// -1. split MessagePipeline context into active/passive, remove playerState from MessagePipelineContext
// 0. implement useDataSourceInfo() in terms of current usePanelContext and useMessagePipeline
// 1. rename MessageHistory to PanelAPI.ItemsByPath
// 2. rename MessageHistoryOnlyTopics to PanelAPI.Messages
// 3. move topicPrefix handling from MessageHistory to PanelAPI.Messages using useDataSourceInfo


type Subscriptions = {[path: string]: {historySize?: number}};
function useSubscriptions(subs: Subscriptions): {itemsByPath: T} {

    const {topics,datatypes} = PanelAPI.useDataSourceInfo()

    const metadataByPath = getMetadataByPath(Object.keys(itemsByPath), topics, datatypes);

    const itemsByPath = useMessages({
        topics,

        // these need access to datatypes for enum values
        restore(itemsByPath){},
        addMessage(itemsByPath, message){},
    });

    return {itemsByPath, metadataByPath}
}

    const {itemsByPath, metadataByPath} = useItemsByPath({  // or PanelAPI.useMessages(useSubscriptions(...))
        "/my_topic.field1.foo": { historySize: 1 },
        "/topic2": { imageScale: 0.5 },
    }));

    traverseMessageField(datatype, ".field1.foo") // returns annotated enum info
}
