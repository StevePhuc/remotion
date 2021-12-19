import {GetFunctionCommand} from '@aws-sdk/client-lambda';
import {AwsRegion} from '../pricing/aws-regions';
import {getLambdaClient} from '../shared/aws-clients';
import {LambdaVersions} from '../shared/constants';
import {getFunctionVersion} from '../shared/get-function-version';
import {validateAwsRegion} from '../shared/validate-aws-region';

export type FunctionInfo = {
	functionName: string;
	timeoutInSeconds: number;
	memorySizeInMb: number;
	version: LambdaVersions | null;
};

export type GetFunctionInfoInput = {
	region: AwsRegion;
	functionName: string;
};

/**
 * @description Given a region and function name, returns information about the function such as version, memory size and timeout.
 * @link https://remotion-3.vercel.app/docs/lambda/getfunctioninfo
 * @param {AwsRegion} options.region The region in which the function resides in.
 * @param {string} options.functionName The name of the function
 * @return {Promise<FunctionInfo>} Promise resolving to information about the function.
 */
export const getFunctionInfo = async ({
	region,
	functionName,
}: GetFunctionInfoInput): Promise<FunctionInfo> => {
	validateAwsRegion(region);

	const [functionInfo, version] = await Promise.all([
		getLambdaClient(region).send(
			new GetFunctionCommand({
				FunctionName: functionName,
			})
		),
		getFunctionVersion({
			functionName,
			region,
		}),
	]);

	return {
		functionName,
		timeoutInSeconds: functionInfo.Configuration?.Timeout as number,
		memorySizeInMb: functionInfo.Configuration?.MemorySize as number,
		version,
	};
};
