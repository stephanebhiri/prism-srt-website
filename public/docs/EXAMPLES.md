# Usage Examples

Common scenarios and how to handle them.

## Example 1: Basic stereo downmix

**Scenario**: You have a 5.1 source and need stereo output.

**Input**:
- PID 260: 6 channels (FL, FR, C, LFE, SL, SR)

**Output**:
- PID 300: 2 channels (L, R)

**Matrix**:
- FL → L
- FR → R
- C → L + R (center to both)
- SL → L (surround left to left)
- SR → R (surround right to right)

## Example 2: Swapping channels

**Scenario**: Left and right channels are reversed in your source.

**Input**:
- PID 260: 2 channels (FL, FR)

**Output**:
- PID 300: 2 channels (L, R)

**Matrix**:
- FL → R (swap)
- FR → L (swap)

## Example 3: Extracting one channel

**Scenario**: You only need the left channel from a stereo stream.

**Input**:
- PID 260: 2 channels (FL, FR)

**Output**:
- PID 300: 1 channel (Mono)

**Matrix**:
- FL → Mono

## Example 4: Upmixing stereo to 5.1

**Scenario**: Converting stereo to 5.1 layout.

**Input**:
- PID 260: 2 channels (FL, FR)

**Output**:
- PID 300: 6 channels (FL, FR, C, LFE, SL, SR)

**Matrix**:
- FL → FL
- FR → FR
- FL → SL (copy left to surround left)
- FR → SR (copy right to surround right)
- FL + FR → C (both to center)

## Example 5: Multiple sources

**Scenario**: Combining audio from two different PIDs.

**Input**:
- PID 260: 2 channels (Commentary FL, FR)
- PID 261: 2 channels (Music FL, FR)

**Output**:
- PID 300: 2 channels (L, R)

**Matrix**:
- 260.FL → L
- 260.FR → R
- 261.FL → L (mix with commentary)
- 261.FR → R (mix with commentary)

## Example 6: Creating multiple outputs

**Scenario**: Need both stereo and 5.1 outputs.

**Input**:
- PID 260: 6 channels (FL, FR, C, LFE, SL, SR)

**Outputs**:
- PID 300: 2 channels (stereo mix)
- PID 301: 6 channels (5.1 passthrough)

Just create two output PIDs with different mappings.

## Tips

- Always probe your source first to see available PIDs and channels
- Test with a short segment before running on live streams
- Monitor FFmpeg stats to ensure proper processing
- Check SRT stats for network performance
