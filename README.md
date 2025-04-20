# go-video-cleanup

A process to clean up videos that are old and high def

```bash
docker build -t xerofuzzion/cam-video-server:latest -t xerofuzzion/cam-video-server:v0.3 .
docker push xerofuzzion/cam-video-server:v0.3
docker push xerofuzzion/cam-video-server:latest
```

## Testing

```bash
npm run dev
DATA_PATH="cameras/" CAMERA_NAMES="EastCam,WestCam" node ./dist/main.js
```

```bash
sudo docker run --rm -e CAMERA_NAMES="EastCam,WestCam" -e DATA_PATH="/data" -e DATA_PATH_PREFIX="data" -v /mnt/Additional/git/cam-video-server/cameras:/data -p 8070:8070 -e SERVER_PORT=8070 xerofuzzion/cam-video-server:latest
```
