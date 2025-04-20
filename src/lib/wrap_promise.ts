import type { Result } from "./result";
import { Err, Ok } from "./result";
import { ErrorCode, StatusError, UnknownError } from "./status_error";

/** Wraps the given promise into a result type. No errors should be propogated. */
export async function WrapPromise<TInput>(
    promise: Promise<TInput>,
    textForUnknown: string,
    ...mutators: ((error: StatusError) => void)[]
): Promise<Result<TInput, StatusError>> {
    return new Promise<Result<TInput, StatusError>>((resolve) => {
        promise
            .then((v) => {
                resolve(Ok(v));
            })
            .catch((e: unknown) => {
                let outputError: StatusError;
                if (e instanceof StatusError) {
                    outputError = e;
                } else if (e instanceof Error) {
                    outputError = new StatusError(
                        ErrorCode.UNKNOWN,
                        `${textForUnknown} [${e.message}]`,
                        e
                    );
                    outputError.setPayload("error", e);
                } else {
                    outputError = ConvertToUnknownError(textForUnknown)(e);
                }
                for (const mutator of mutators) {
                    outputError.with(mutator);
                }
                resolve(Err(outputError));
            });
    });
}

/** Converts unknown data to an unknown error. */
export function ConvertToUnknownError(errorStr: string): (err: unknown) => StatusError {
    return (err: unknown) => {
        if (err instanceof Error) {
            return UnknownError(`${errorStr}. "${err.message}" "${err.stack}"`);
        }

        if (err instanceof StatusError) {
            return err;
        }

        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return UnknownError(`${errorStr}. "${err}"`);
    };
}
