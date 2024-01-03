import fastify from 'fastify';
import packageJson from '../package.json';

const fastifyServer = fastify();

fastifyServer.get('/', async (_, reply) => {
    reply.send({
        name: packageJson.name,
        status: 'running',
        version: packageJson.version,
    });
});

// in a production environment, uploading a file to our server directly might not be a good idea, especially so in a serverless environment
// instead, we could use signed URLs to upload files straight to AWS S3 (or similar) and process them from there
// for the sake of simplicity, we'll just upload the file to our server
fastifyServer.post('/file-upload', (request, reply) => {
    reply.send({ status: 'ok' });
});

const port = Number(process.env.PORT) || 3000;

fastifyServer.listen({ port }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log(`Server listening at ${address}`);
});
