# fhta

## Usage

Node version: `20.10.0`.

Local installation and usage:
```
npm install
npm run dev
```

Optionally, you can set a `PORT` environment variable to control the port which the server will listen to.
After that, you can just use Postman to upload files:

- configure Postman for a `POST` request to `http://localhost:3000/file-upload`
- set `Body` to `form-data`, add a key of type `File` (name is irrelevant, can leave empty)
- select whatever MP3 file you want to use (other file types will result in a `400`)
- send request

## Description

I found multiple resources about parsing MP3 files and all of them mentioned that in order to obtain the frame count, we would need to parse the file for
so-called "frame headers", which are 32-bit values starting with `0xFF 0xFB` sequences (always so for MPEG Version 1, Audio Layer III).

When going through the application, you will find that I have two possible ways of getting the frame count:
- [first one](src/index.ts#L34-L35) is looking for certain keywords and then getting the frame count from certain bytes (not all files support this, though, but many did in my tests)
    - this method is detailed [here](http://www.multiweb.cz/twoinches/mp3inside.htm#VBR)
    - implementation consists of the [`getStoredFrameCount` function](src/mpeg.ts#L68-L91)
    - if this method fails, it will move on to the second one
- [second one](src/index.ts#L37-L38) is "brute-forcing", aka, counting the actual frames, by finding the first frame header, then computing the frame size and iterating the file frame-by-frame
    - implementation consists of the [`countFrames` function](src/mpeg.ts#L49-L66)

## Possible improvements

There are plenty of improvements that I would do to this application, were it a production app.

- use streams instead of accumulating the whole file in memory (aka, [no calling `toBuffer` function](src/index.ts#L27-L29))
    - this would allow us to work with files of any size, without overloading the server's memory
    - I already created an implementation using streams, but for some reason, which I had no time to debug, the upload stream was a little unstable and would get stuck randomly before ending
    - stream implementation available [here](src/mpeg.ts#L93-L106)

- this could probably fit nicely as an AWS Lambda, having MP3 files uploaded to S3 and streaming them in the lambda as we need them
