import type {VideoSample, VideoTrack} from '@remotion/media-parser';
import {getVideoDecoderConfigWithHardwareAcceleration} from './get-config';

export type WebCodecsVideoDecoder = {
	processSample: (videoSample: VideoSample) => Promise<void>;
	waitForFinish: () => Promise<void>;
	close: () => void;
	getQueueSize: () => number;
	flush: () => Promise<void>;
};

export const createVideoDecoder = async ({
	track,
	onFrame,
	onError,
	signal,
}: {
	track: VideoTrack;
	onFrame: (frame: VideoFrame) => Promise<void>;
	onError: (error: DOMException) => void;
	signal: AbortSignal;
}): Promise<WebCodecsVideoDecoder | null> => {
	if (typeof VideoDecoder === 'undefined') {
		return null;
	}

	const config = await getVideoDecoderConfigWithHardwareAcceleration(track);

	if (!config) {
		return null;
	}

	let outputQueue = Promise.resolve();
	let outputQueueSize = 0;
	let dequeueResolver = () => {};

	const videoDecoder = new VideoDecoder({
		output(inputFrame) {
			outputQueueSize++;
			outputQueue = outputQueue
				.then(() => onFrame(inputFrame))
				.then(() => {
					outputQueueSize--;
					dequeueResolver();
					return Promise.resolve();
				});
		},
		error(error) {
			onError(error);
		},
	});

	const close = () => {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		signal.removeEventListener('abort', onAbort);
		videoDecoder.close();
	};

	const onAbort = () => {
		close();
	};

	signal.addEventListener('abort', onAbort);

	const getQueueSize = () => {
		return videoDecoder.decodeQueueSize + outputQueueSize;
	};

	videoDecoder.configure(config);

	const waitForDequeue = async () => {
		await new Promise<void>((r) => {
			dequeueResolver = r;
			videoDecoder.addEventListener('dequeue', () => r(), {
				once: true,
			});
		});
	};

	const waitForFinish = async () => {
		while (getQueueSize() > 0) {
			await waitForDequeue();
		}
	};

	const processSample = async (sample: VideoSample) => {
		if (videoDecoder.state === 'closed') {
			return;
		}

		while (getQueueSize() > 10) {
			await waitForDequeue();
		}

		// @ts-expect-error - can have changed in the meanwhile
		if (videoDecoder.state === 'closed') {
			return;
		}

		if (sample.type === 'key') {
			await videoDecoder.flush();
		}

		videoDecoder.decode(new EncodedVideoChunk(sample));
	};

	let inputQueue = Promise.resolve();

	return {
		processSample: (sample: VideoSample) => {
			inputQueue = inputQueue.then(() => processSample(sample));
			return inputQueue;
		},
		waitForFinish: async () => {
			await videoDecoder.flush();
			await waitForFinish();
			await outputQueue;
			await inputQueue;
		},
		close,
		getQueueSize,
		flush: async () => {
			await videoDecoder.flush();
		},
	};
};
