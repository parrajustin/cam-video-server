import { readdir } from "fs/promises";
import { Ok, Result } from "lib/result";
import { StatusError } from "lib/status_error";
import { WrapPromise } from "lib/wrap_promise";
import { DateTime } from "luxon";
import { join } from "path";
import { ReturnDataWithPathToDrop } from "./return_data";

export interface VideoEntryData {
    timeOfVideoStart: DateTime<true>;
    path: string;
}

// Read the camera 1 minute video segments from within the /{Cam Name}/{Date}/001/dav/{Hour} dir.
export async function ReadCameraHourDir(
    cameraHourDir: string,
    cameraName: string,
    hour: string,
    hourTime: DateTime<true>
): Promise<Result<ReturnDataWithPathToDrop<VideoEntryData[]>, StatusError>> {
    // First get all files in the camera dir /{Cam Name}/{Date}/001/dav/{Hour}.
    const parentReadDir = await WrapPromise(
        readdir(cameraHourDir, { recursive: false }),
        /*textForUnknown=*/ `Failed to read dirs under /${cameraName}/${hourTime.toISODate()}/001/dav/${hour}.`
    );
    if (parentReadDir.err) {
        return parentReadDir;
    }

    // Keep track of files/dirs to delete
    const pathsToDrop: string[] = [];

    // Iterate paths looking for video data.
    const fileRegex = new RegExp(/^\d\d.(\d\d).\d\d-\d\d.\d\d.\d\d\[F\]\[0@0\]\[0\].mp4$/);
    const videoData: VideoEntryData[] = [];
    for (const path of parentReadDir.safeUnwrap()) {
        // Skip and leave all the .idx files.
        if (path.endsWith(".idx") || path.endsWith(".idx_") || path.endsWith(".mp4_")) {
            continue;
        }
        if (!path.endsWith(".mp4")) {
            pathsToDrop.push(join(cameraHourDir, path));
            continue;
        }

        // Expect path to be like "20.09.00-20.10.00[F][0@0][0].mp4".
        const match = path.match(fileRegex);
        if (match === null) {
            pathsToDrop.push(join(cameraHourDir, path));
            continue;
        }

        // Minute parsing of the 1 minute video file.
        const minute = match[1] as string;
        if (minute === null || minute.length !== 2) {
            pathsToDrop.push(join(cameraHourDir, path));
            continue;
        }
        const minuteTime = hourTime.set({ minute: parseInt(minute) });
        videoData.push({
            timeOfVideoStart: minuteTime,
            path: join(cameraHourDir, path)
        });
    }

    const returnee: ReturnDataWithPathToDrop<VideoEntryData[]> = {
        data: videoData,
        pathsToDrop: pathsToDrop
    };
    return Ok(returnee);
}
