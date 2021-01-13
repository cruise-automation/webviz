# Playback performance

Displays statistics on recent playback and data-streaming performance.

"Instantaneous" statistics are reported based on the most recent frame, and also averaged over the last five seconds.

## Playback speed

The player tries to play at the speed specified by the user, but may not be able to keep up, given heavy layouts and large amounts of data. This chart displays the _actual_ playback speed as a ratio of bag time to playback time.

## Frame rate

The number of frames played per second. Though the player can play back at up to 60fps, this statistic will be lower if frames take longer than 16ms to render.

## Bag frame time

The duration in bag-time for the rendered frames in milliseconds. To "keep up" with playback, Webviz will often emit "larger" frames.

## Data throughput

The amount of data received by the player in megabits per second. For remote bags, this includes topics that the player is not subscribed to.

This statistic does not account for `Content-Encoding` compression, so it may be larger than the actual network bandwidth.
