import fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import packageJson from '../package.json';
import { countFrames, getStoredFrameCount } from './mpeg';

const port = Number(process.env.PORT) || 3000;
const fastifyServer = fastify();

fastifyServer.register(fastifyMultipart);

fastifyServer.get('/', async (_, reply) => {
    reply.send({
        name: packageJson.name,
        status: 'running',
        version: packageJson.version,
    });
});

fastifyServer.post('/file-upload', async (request, reply) => {
    // allow only mp3 files up to 100MB
    const data = await request.file({ limits: { fileSize: 100 * 1024 * 1024 } });

    if (data.mimetype !== 'audio/mpeg') {
        return reply.status(400).send({ error: 'Invalid file type. Please use a valid mp3 file.' });
    }

    // in a production environment, we should use data.file to get a stream of the file
    // I tried doing that, but the resulting stream was a little unstable and I didn't really have the time to properly debug it
    const buffer = await data.toBuffer();

    let frameCount;

    try {
        // try to get the frame count from the metadata, if it exists
        frameCount = getStoredFrameCount(buffer);
    } catch (err) {
        // no frame count stored in metadata, let's try counting the frames
        frameCount = countFrames(buffer);
    }

    reply.status(200).send({ frameCount });
});

fastifyServer.listen({ port }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log(`Server listening at ${address}`);
});
