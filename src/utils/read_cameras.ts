import { readdir, stat } from "fs/promises";
import { Result, Ok, StatusResult } from "lib/result";
import { StatusError } from "lib/status_error";
import { WrapPromise } from "lib/wrap_promise";
import { join } from "path";
import { ReturnDataWithPathToDrop } from "./return_data";
import { AsyncForEach, CombineResults } from "lib/async_util";
import { DayVideoImageData, ReadCameraDateDir } from "./read_camera_date_dir";

export interface CameraData {
    name: string;
    dates: { [key: string]: DayVideoImageData };
}

/** Get the camera parent root dirs. */
export async function GetCameras(
    cameraBaseDir: string,
    cameraNames: string[]
): Promise<Result<ReturnDataWithPathToDrop<Record<string, CameraData>>, StatusError>> {
    const allowedPaths = new Set<string>(cameraNames);
    const dirsToDrop: string[] = [];

    // First get all files in the cameras at {base}/.
    const baseDirRead = await WrapPromise(
        readdir(cameraBaseDir, { recursive: false }),
        /*textForUnknown=*/ `Failed to read dirs under /.`
    );
    if (baseDirRead.err) {
        return baseDirRead;
    }

    const returnData: Record<string, CameraData> = {};
    const individualCamResult = AsyncForEach(
        baseDirRead.safeUnwrap(),
        async (file): Promise<StatusResult<StatusError>> => {
            if (!allowedPaths.has(file)) {
                dirsToDrop.push(join(cameraBaseDir, file));
                return Ok();
            }
            const cameraDir = join(cameraBaseDir, file);
            const entryStat = await stat(cameraDir);
            if (!entryStat.isDirectory()) {
                return Ok();
            }
            const returnee = await ReadCameraDateDir(cameraDir, file);
            if (returnee.err) {
                return returnee;
            }

            const camData: CameraData = {
                name: file,
                dates: {}
            };
            for (const data of returnee.safeUnwrap().data) {
                camData.dates[data.dayStart.toISODate()] = data;
            }
            dirsToDrop.push(...returnee.safeUnwrap().pathsToDrop);
            returnData[file] = camData;
            return Ok();
        }
    );
    const readHourData = await Promise.all(individualCamResult);
    const combinedData = CombineResults(readHourData);
    if (combinedData.err) {
        return combinedData;
    }

    return Ok({ data: returnData, pathsToDrop: dirsToDrop });
}
