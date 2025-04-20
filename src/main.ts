import { StatusError } from "lib/status_error";
import { Ok, Result } from "lib/result";
import { CameraData, GetCameras } from "utils/read_cameras";
import { createLogger, format, transports } from "winston";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

const myFormat = format.printf(({ level, message, timestamp }) => {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    level: "info",
    format: format.combine(format.timestamp(), myFormat),
    defaultMeta: { service: "cam-video-server" },
    transports: [
        //
        // - Write all logs with importance level of `error` or higher to `error.log`
        //   (i.e., error, fatal, but not other levels)
        //
        new transports.Console()
    ]
});

const videoPath = process.env.DATA_PATH ?? "/data";
const videoPathPrefix = process.env.DATA_PATH ?? "data";
const serverPort = Number.parseInt(process.env.SERVER_PORT ?? "8080");
const camNames = (process.env.CAMERA_NAMES ?? "").split(",");

async function GetCameraData(): Promise<Result<Record<string, CameraData>, StatusError>> {
    const camReturnData = await GetCameras(videoPath, camNames);
    if (camReturnData.err) {
        return camReturnData;
    }

    return Ok(camReturnData.val.data);
}
const fastify = Fastify({
    logger: true
});

fastify.register(fastifyStatic, {
    root: videoPath,
    prefix: `/${videoPathPrefix}/` // optional: default '/'
});

fastify.get("/cams", async (_request, reply) => {
    reply.type("application/json");

    const camData = await GetCameraData();
    if (camData.err) {
        logger.error("Failed to get camera data: " + camData.err);
        reply.status(500);
        return { success: false, message: camData.val.toString() };
    }

    reply.status(200);
    return { success: true, message: camData.val };
});

// Run the server!
fastify.listen({ port: serverPort }, (err) => {
    if (err) throw err;
    // Server is now listening on ${address}
});
