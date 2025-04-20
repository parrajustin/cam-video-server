import { readdir, stat } from "fs/promises";
import { Result, Ok } from "lib/result";
import { StatusError } from "lib/status_error";
import { WrapPromise } from "lib/wrap_promise";
import { DateTime } from "luxon";
import { join } from "path";
import { ReturnDataWithPathToDrop } from "./return_data";
import { AsyncForEach, CombineResults } from "lib/async_util";
import { HourVideoImageData, ReadCameraDateChildDir } from "./read_camera_date_child_dir";
import { None, Option, Some } from "lib/option";

export interface DayVideoImageData {
    dayStart: DateTime<true>;
    videos: HourVideoImageData[];
}

/** Read the data within a parent camera dir. */
export async function ReadCameraDateDir(
    cameraDir: string,
    cameraName: string
): Promise<Result<ReturnDataWithPathToDrop<DayVideoImageData[]>, StatusError>> {
    const allowedFiles = new Set<string>(["DVRWorkDirectory"]);
    const dirsToDrop: string[] = [];
    // First get all files in the camera dir /{Cam Name}/ we want to find the ISO date.
    const readCameraDir = await WrapPromise(
        readdir(cameraDir, { recursive: false }),
        /*textForUnknown=*/ `Failed to read dirs under /${cameraName}.`
    );
    if (readCameraDir.err) {
        return readCameraDir;
    }

    const readHourVideos = AsyncForEach(
        readCameraDir.safeUnwrap(),
        async (
            file
        ): Promise<Result<Option<ReturnDataWithPathToDrop<DayVideoImageData>>, StatusError>> => {
            if (allowedFiles.has(file)) {
                return Ok(None);
            }
            const entryPath = join(cameraDir, file);
            const entryStat = await stat(entryPath);
            if (!entryStat.isDirectory()) {
                dirsToDrop.push(entryPath);
                return Ok(None);
            }

            // Delete folders that aren't the length of 'YYYY-MM-DD'.
            const isExpectedLength = file.length === 10;
            if (!isExpectedLength) {
                dirsToDrop.push(entryPath);
                return Ok(None);
            }

            // Attempt to parse the folder name.
            const date = DateTime.fromISO(file, {
                setZone: true,
                zone: "US/Mountain"
            });
            if (!date.isValid) {
                dirsToDrop.push(entryPath);
                return Ok(None);
            }

            const childData = await ReadCameraDateChildDir(
                entryPath,
                cameraName,
                date as DateTime<true>
            );
            if (childData.err) {
                return childData;
            }

            const returnee: ReturnDataWithPathToDrop<DayVideoImageData> = {
                data: {
                    dayStart: date,
                    videos: childData.safeUnwrap().data
                },
                pathsToDrop: childData.safeUnwrap().pathsToDrop
            };
            return Ok(Some(returnee));
        }
    );
    const readHourData = await Promise.all(readHourVideos);
    const combinedData = CombineResults(readHourData);
    if (combinedData.err) {
        return combinedData;
    }

    const returnee: DayVideoImageData[] = [];
    for (const data of combinedData.safeUnwrap()) {
        if (data.none) {
            continue;
        }

        returnee.push(data.safeValue().data);
        dirsToDrop.push(...data.safeValue().pathsToDrop);
    }

    return Ok({ data: returnee, pathsToDrop: dirsToDrop });
}
