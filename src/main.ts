import { StatusError } from "lib/status_error";
import { Ok, Result } from "lib/result";
import { CameraData, GetCameras } from "utils/read_cameras";
import { createLogger, format, transports } from "winston";
import express from "express";
// import Fastify from "fastify";
// import fastifyStatic from "@fastify/static";

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
const videoPathPrefix = process.env.DATA_PATH_PREFIX ?? "data";
const serverPort = Number.parseInt(process.env.SERVER_PORT ?? "8080");
const camNames = (process.env.CAMERA_NAMES ?? "").split(",");

async function GetCameraData(): Promise<Result<Record<string, CameraData>, StatusError>> {
    const camReturnData = await GetCameras(videoPath, camNames);
    if (camReturnData.err) {
        return camReturnData;
    }

    return Ok(camReturnData.val.data);
}

const app = express();

app.use((req, _res, next) => {
    logger.info(`- ${req.method} ${req.url}`);
    next();
});

app.use(`/${videoPathPrefix}`, express.static(videoPath));

app.get("/", (_req, res) => {
    res.send("Hello World");
});

app.get("/cams", async (_req, res, _next): Promise<void> => {
    res.type("application/json");

    const camData = await GetCameraData();
    if (camData.err) {
        logger.error("Failed to get camera data: " + camData.err);
        res.status(500).send({ success: false, message: camData.val.toString() });
        return;
    }

    res.status(200).send({ success: true, message: camData.val });
});

app.listen(serverPort, (err) => {
    if (err) throw err;
    logger.info(`Server is listening on port ${serverPort}`);
});
