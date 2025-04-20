# go-video-cleanup

A process to clean up videos that are old and high def

```bash
docker build -t xerofuzzion/cam-video-server:latest -t xerofuzzion/cam-video-server:v0.1 .
docker push xerofuzzion/cam-video-server:v0.1
docker push xerofuzzion/cam-video-server:latest
```

## Testing

```bash
npm run dev
DATA_PATH="cameras/" CAMERA_NAMES="EastCam,WestCam" node ./dist/main.js
```
