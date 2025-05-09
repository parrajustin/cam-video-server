import { StatusError } from "lib/status_error";
import { Ok, Result } from "lib/result";
import { CameraData, GetCameras } from "utils/read_cameras";
import { createLogger, format, transports } from "winston";
import cors from "cors";
import express from "express";
import { extname } from "path";
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

const staticPath = process.env.STATIC_PATH ?? "/static";
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

app.use(cors());

app.use((req, _res, next) => {
    logger.info(`- [${req.method}] ${req.url}`);
    next();
});

app.use(
    `/static`,
    express.static(staticPath, {
        setHeaders: (res, path, _stat) => {
            switch (extname(path)) {
                case ".css":
                    res.setHeader("Content-Type", "text/css");
                    break;
            }
        }
    })
);
app.use(
    `/${videoPathPrefix}`,
    express.static(videoPath, {
        setHeaders: (res, path, _stat) => {
            switch (extname(path)) {
                case ".mp4":
                    res.setHeader("Content-Type", "video/mp4");
                    break;
            }
        }
    })
);

app.get("/", (_req, res) => {
    res.send("Hello World");
});

app.get("/019656a2-ef1d-710c-8946-0396075162c2", (_req, res) => {
    res.send({ success: true, message: "019656a2-ef1d-710c-8946-0396075162c2" });
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
