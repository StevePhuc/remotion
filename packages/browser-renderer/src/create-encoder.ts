import { createFile } from "mp4box";

export const createEncoder = ({
  width,
  height,
  sampleDurations,
  onProgress,
}: {
  width: number;
  height: number;
  sampleDurations: number[];
  onProgress: (encoded: number) => void;
}) => {
  let trackID: number | null = null;

  let encodedFrames = 0;

  const outputMp4 = createFile();

  const encoder = new VideoEncoder({
    output(chunk, metadata) {
      const uint8 = new Uint8Array(chunk.byteLength);
      chunk.copyTo(uint8);

      const timescale = 90000;
      if (trackID === null) {
        trackID = outputMp4.addTrack({
          width,
          height,
          timescale,
          avcDecoderConfigRecord: (metadata.decoderConfig as VideoDecoderConfig)
            .description,
        });
      }

      const sampleDuration =
        (sampleDurations.shift() as number) / (1_000_000 / timescale);

      outputMp4.addSample(trackID, uint8, {
        duration: sampleDuration,
        is_sync: chunk.type === "key",
      });

      encodedFrames++;
      onProgress(encodedFrames);
    },
    error(error) {
      console.error(error);
    },
  });

  encoder.configure({
    codec: "avc1.4d0034",
    width,
    height,
    hardwareAcceleration: "prefer-hardware",
    bitrate: 20_000_000,
  });

  return { encoder, outputMp4 };
};
