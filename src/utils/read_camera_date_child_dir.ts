import { readdir, stat } from "fs/promises";
import { Result, Err, Ok } from "lib/result";
import { StatusError, NotFoundError, InternalError } from "lib/status_error";
import { WrapPromise } from "lib/wrap_promise";
import { DateTime } from "luxon";
import { join } from "path";
import { ReturnDataWithPathToDrop } from "./return_data";
import { ReadCameraHourDir, VideoEntryData } from "./read_camera_hour_dir";
import { AsyncForEach, CombineResults } from "lib/async_util";

export interface HourVideoImageData {
    hourOfDayStart: DateTime<true>;
    videos: VideoEntryData[];
}

/** Read the video data from the camera path at /{Cam Name}/{Date}. */
export async function ReadCameraDateChildDir(
    cameraDateDir: string,
    cameraName: string,
    day: DateTime<true>
): Promise<Result<ReturnDataWithPathToDrop<HourVideoImageData[]>, StatusError>> {
    // First get all files in the camera dir --> /{Cam Name}/{Date} <-- only expect 001.
    const readCameraDateDir = await WrapPromise(
        readdir(cameraDateDir, { recursive: false }),
        /*textForUnknown=*/ `Failed to read dirs under /${cameraName}/${day.toISODate()}.`
    );
    if (readCameraDateDir.err) {
        return readCameraDateDir;
    }

    // Keep track of files/dirs to delete
    const pathsToDrop: string[] = [];

    // Delete all other files/folders other than "001".
    const hasExpectedFolder = readCameraDateDir.safeUnwrap().findIndex((v) => v === "001") !== -1;
    pathsToDrop.push(...readCameraDateDir.safeUnwrap().filter((v) => v !== "001"));
    if (!hasExpectedFolder) {
        return Err(
            NotFoundError(`Could not find the 001 folder in /${cameraName}/${day.toISODate()}/`)
        );
    }
    // A check to make sure "001" is a folder.
    const childPath = join(cameraDateDir, "001");
    const childStat = await WrapPromise(
        stat(childPath),
        /*textForUnknown=*/ `Failed to get file stat of /${cameraName}/${day.toISODate()}/001.`
    );
    if (childStat.err) {
        return childStat;
    }
    if (!childStat.safeUnwrap().isDirectory()) {
        return Err(InternalError(`Path /${cameraName}/${day.toISODate()}/001 is not a directory.`));
    }

    // Inside "001" we expect only "dav", and "jpg".
    const childReadDir = await WrapPromise(
        readdir(childPath, { recursive: false }),
        /*textForUnknown=*/ `Failed to read dirs under /${cameraName}/${day.toISODate()}/001.`
    );
    if (childReadDir.err) {
        return childReadDir;
    }

    // For now drop the "jpg" folder as we don't do anything with the images.
    pathsToDrop.push(...childReadDir.safeUnwrap().filter((v) => v !== "dav"));
    // pathsToDrop.push(...childReadDir.safeUnwrap().filter((v) => v !== "dav" && v !== "jpg"));

    // Inside "dav" folder get all the hours now.
    const davPath = join(childPath, "dav");
    const davReadDir = await WrapPromise(
        readdir(davPath, { recursive: false }),
        /*textForUnknown=*/ `Failed to read dirs under /${cameraName}/${day.toISODate()}/001/dav`
    );
    if (davReadDir.err) {
        return davReadDir;
    }

    // Go through all the hours and check they are only the accepted paths. 0...23
    const nums = Array.from({ length: 24 }, (_, i) => i).map((v) => `${v}`);
    const acceptedPaths = new Set<string>(nums);

    const hourFolderDir: { path: string; hour: string }[] = [];
    for (const hour of davReadDir.safeUnwrap()) {
        if (!acceptedPaths.has(hour)) {
            pathsToDrop.push(join(davPath, hour));
            continue;
        }
        hourFolderDir.push({ path: join(davPath, hour), hour });
    }

    // Async compute each hour data dir.
    const readHourVideos = AsyncForEach(
        hourFolderDir,
        async (
            hourData
        ): Promise<Result<ReturnDataWithPathToDrop<HourVideoImageData>, StatusError>> => {
            const hourTime = day.set({ hour: parseInt(hourData.hour) });
            const data = await ReadCameraHourDir(
                hourData.path,
                cameraName,
                hourData.hour,
                hourTime
            );
            if (data.err) {
                return data;
            }

            const returnee: ReturnDataWithPathToDrop<HourVideoImageData> = {
                data: {
                    hourOfDayStart: hourTime,
                    videos: data.safeUnwrap().data
                },
                pathsToDrop: data.safeUnwrap().pathsToDrop
            };
            return Ok(returnee);
        }
    );
    const readHourData = await Promise.all(readHourVideos);
    const combinedData = CombineResults(readHourData);
    if (combinedData.err) {
        return combinedData;
    }

    // Build the return data.
    const dateDirReturnee: ReturnDataWithPathToDrop<HourVideoImageData[]> = {
        data: [],
        pathsToDrop: []
    };
    for (const data of combinedData.safeUnwrap()) {
        dateDirReturnee.data.push(data.data);
        dateDirReturnee.pathsToDrop.push(...data.pathsToDrop);
    }
    return Ok(dateDirReturnee);
}
