import { Result, Ok } from "./result";
import { StatusError } from "./status_error";

/**
 * Applies an async operation over the data.
 * @param data the data to iterate over
 * @param cb the callback to apply to each
 * @returns array of promises for the data.
 */
export function AsyncForEach<InputType, OutputType>(
    data: InputType[],
    cb: (input: InputType) => Promise<OutputType>
): Promise<OutputType>[] {
    return data.map((innerData) => {
        return Promise.resolve(cb(innerData));
    });
}

export function CombineResults<T>(results: Result<T, StatusError>[]): Result<T[], StatusError> {
    const returnee: T[] = [];
    for (const result of results) {
        if (result.err) {
            return result;
        }
        returnee.push(result.safeUnwrap());
    }
    return Ok(returnee);
}
